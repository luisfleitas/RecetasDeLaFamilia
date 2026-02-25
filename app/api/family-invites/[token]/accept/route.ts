import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import {
  getInviteState,
  hashFamilyInviteToken,
  isInviteExpired,
} from "@/lib/families/utils";
import { getPrisma } from "@/lib/prisma";
import { FamilyInviteDecisionStatus, FamilyRole, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ token: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { token } = await params;
  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid invite token", code: "INVITE_INVALID" }, { status: 400 });
  }

  try {
    const prisma = await getPrisma();
    const tokenHash = hashFamilyInviteToken(token);

    const invite = await prisma.familyInvite.findUnique({
      where: { tokenHash },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invalid invite token", code: "INVITE_INVALID" }, { status: 400 });
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

      return NextResponse.json({ ok: true, code: "ALREADY_MEMBER" });
    }

    const now = new Date();
    if (invite.revokedAt) {
      return NextResponse.json({ error: "Invite revoked", code: "INVITE_REVOKED" }, { status: 409 });
    }

    if (invite.consumedAt) {
      return NextResponse.json({ error: "Invite consumed", code: "INVITE_CONSUMED" }, { status: 409 });
    }

    if (isInviteExpired(invite.expiresAt, now)) {
      return NextResponse.json({ error: "Invite expired", code: "INVITE_EXPIRED" }, { status: 409 });
    }

    try {
      await prisma.$transaction(async (tx) => {
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
        return NextResponse.json({ ok: true, code: "ALREADY_MEMBER" });
      }

      if (error instanceof Error && error.message === "INVITE_NO_LONGER_ACTIVE") {
        const reloaded = await prisma.familyInvite.findUnique({ where: { id: invite.id } });
        if (!reloaded) {
          return NextResponse.json({ error: "Invalid invite token", code: "INVITE_INVALID" }, { status: 400 });
        }

        const state = getInviteState(reloaded);
        if (state === "revoked") {
          return NextResponse.json({ error: "Invite revoked", code: "INVITE_REVOKED" }, { status: 409 });
        }

        if (state === "consumed") {
          return NextResponse.json({ error: "Invite consumed", code: "INVITE_CONSUMED" }, { status: 409 });
        }

        if (state === "expired") {
          return NextResponse.json({ error: "Invite expired", code: "INVITE_EXPIRED" }, { status: 409 });
        }
      }

      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while accepting invite";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
