import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import {
  getInviteState,
  hashFamilyInviteToken,
  isInviteExpired,
  SINGLE_USE_INVITE_MAX_USES,
} from "@/lib/families/utils";
import { isPhase3Enabled } from "@/lib/phase3/config";
import { getRequestId, recordAuditEvent, recordMetric, withRequestId } from "@/lib/phase3/observability";
import { getPrisma } from "@/lib/prisma";
import { FamilyInviteDecisionStatus, FamilyRole, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ token: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const requestId = getRequestId(request);
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return withRequestId(
      NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 }),
      requestId,
    );
  }

  const { token } = await params;
  if (!token || token.length < 10) {
    return withRequestId(
      NextResponse.json({ error: "Invalid invite token", code: "INVITE_INVALID" }, { status: 400 }),
      requestId,
    );
  }

  try {
    const prisma = await getPrisma();
    const tokenHash = hashFamilyInviteToken(token);

    const invite = await prisma.familyInvite.findUnique({
      where: { tokenHash },
    });

    if (!invite) {
      return withRequestId(
        NextResponse.json({ error: "Invalid invite token", code: "INVITE_INVALID" }, { status: 400 }),
        requestId,
      );
    }

    const existingMembership = await prisma.familyMembership.findUnique({
      where: {
        familyId_userId: {
          familyId: invite.familyId,
          userId: authUser.userId,
        },
      },
    });

    if (existingMembership) {
      await prisma.familyInviteDecision.upsert({
        where: {
          inviteId_userId: {
            inviteId: invite.id,
            userId: authUser.userId,
          },
        },
        create: {
          inviteId: invite.id,
          userId: authUser.userId,
          status: FamilyInviteDecisionStatus.accepted,
          decidedAt: new Date(),
        },
        update: {
          status: FamilyInviteDecisionStatus.accepted,
          decidedAt: new Date(),
          lastOpenedAt: new Date(),
        },
      });

      return withRequestId(NextResponse.json({ ok: true, code: "ALREADY_MEMBER" }), requestId);
    }

    const now = new Date();
    if (invite.revokedAt) {
      return withRequestId(
        NextResponse.json({ error: "Invite revoked", code: "INVITE_REVOKED" }, { status: 409 }),
        requestId,
      );
    }

    if (invite.consumedAt) {
      return withRequestId(
        NextResponse.json({ error: "Invite consumed", code: "INVITE_CONSUMED" }, { status: 409 }),
        requestId,
      );
    }

    if (isInviteExpired(invite.expiresAt, now)) {
      return withRequestId(
        NextResponse.json({ error: "Invite expired", code: "INVITE_EXPIRED" }, { status: 409 }),
        requestId,
      );
    }

    try {
      await prisma.$transaction(async (tx) => {
        const inviteInTx = await tx.familyInvite.findUnique({
          where: {
            id: invite.id,
          },
        });

        if (!inviteInTx || inviteInTx.revokedAt || inviteInTx.consumedAt || isInviteExpired(inviteInTx.expiresAt, now)) {
          throw new Error("INVITE_NO_LONGER_ACTIVE");
        }

        if (inviteInTx.maxUses === SINGLE_USE_INVITE_MAX_USES) {
          const consumeResult = await tx.familyInvite.updateMany({
            where: {
              id: invite.id,
              revokedAt: null,
              consumedAt: null,
              expiresAt: {
                gt: now,
              },
            },
            data: {
              consumedAt: now,
              consumedByUserId: authUser.userId,
            },
          });

          if (consumeResult.count !== 1) {
            throw new Error("INVITE_NO_LONGER_ACTIVE");
          }
        }

        await tx.familyMembership.create({
          data: {
            familyId: invite.familyId,
            userId: authUser.userId,
            role: FamilyRole.member,
          },
        });

        await tx.familyInviteDecision.upsert({
          where: {
            inviteId_userId: {
              inviteId: invite.id,
              userId: authUser.userId,
            },
          },
          create: {
            inviteId: invite.id,
            userId: authUser.userId,
            status: FamilyInviteDecisionStatus.accepted,
            decidedAt: now,
          },
          update: {
            status: FamilyInviteDecisionStatus.accepted,
            decidedAt: now,
            lastOpenedAt: now,
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return withRequestId(NextResponse.json({ ok: true, code: "ALREADY_MEMBER" }), requestId);
      }

      if (error instanceof Error && error.message === "INVITE_NO_LONGER_ACTIVE") {
        const reloaded = await prisma.familyInvite.findUnique({ where: { id: invite.id } });
        if (!reloaded) {
          return withRequestId(
            NextResponse.json({ error: "Invalid invite token", code: "INVITE_INVALID" }, { status: 400 }),
            requestId,
          );
        }

        const state = getInviteState(reloaded);
        if (state === "revoked") {
          return withRequestId(
            NextResponse.json({ error: "Invite revoked", code: "INVITE_REVOKED" }, { status: 409 }),
            requestId,
          );
        }

        if (state === "consumed") {
          return withRequestId(
            NextResponse.json({ error: "Invite consumed", code: "INVITE_CONSUMED" }, { status: 409 }),
            requestId,
          );
        }

        if (state === "expired") {
          return withRequestId(
            NextResponse.json({ error: "Invite expired", code: "INVITE_EXPIRED" }, { status: 409 }),
            requestId,
          );
        }
      }

      throw error;
    }

    if (isPhase3Enabled()) {
      await recordMetric(prisma, {
        metricName: "invite_accepted",
        requestId,
        actorUserId: authUser.userId,
        familyId: invite.familyId,
        inviteId: invite.id,
        statusCode: 200,
      });
      await recordAuditEvent(prisma, {
        eventType: "membership_added_via_invite",
        requestId,
        actorUserId: authUser.userId,
        familyId: invite.familyId,
        targetUserId: authUser.userId,
        inviteId: invite.id,
        newRole: FamilyRole.member,
      });
    }

    return withRequestId(NextResponse.json({ ok: true }), requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while accepting invite";
    return withRequestId(NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 }), requestId);
  }
}
