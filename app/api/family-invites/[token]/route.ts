import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import {
  buildFamilyPictureUrl,
  getInviteState,
  getInviteUsageType,
  hashFamilyInviteToken,
} from "@/lib/families/utils";
import { isPhase3Enabled } from "@/lib/phase3/config";
import { getRequestId, recordMetric, withRequestId } from "@/lib/phase3/observability";
import { checkRateLimit } from "@/lib/phase3/rate-limit";
import { getPrisma } from "@/lib/prisma";
import { FamilyInviteDecisionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ token: string }>;
};

export async function GET(request: Request, { params }: Params) {
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

    if (isPhase3Enabled()) {
      const rate = checkRateLimit("invite-open", `${authUser.userId}:${token}`, 30, 5 * 60 * 1000);
      if (!rate.allowed) {
        const limitedResponse = NextResponse.json(
          { error: "Too many invite lookups. Please retry later.", code: "RATE_LIMITED" },
          { status: 429 },
        );
        limitedResponse.headers.set("retry-after", String(rate.retryAfterSeconds));
        return withRequestId(limitedResponse, requestId);
      }
    }

    const tokenHash = hashFamilyInviteToken(token);

    const invite = await prisma.familyInvite.findUnique({
      where: {
        tokenHash,
      },
      include: {
        family: true,
      },
    });

    if (!invite) {
      if (isPhase3Enabled()) {
        await recordMetric(prisma, {
          metricName: "invite_opened",
          requestId,
          actorUserId: authUser.userId,
          statusCode: 400,
          metadata: { reason: "invalid_token" },
        });
      }
      return withRequestId(
        NextResponse.json({ error: "Invalid invite token", code: "INVITE_INVALID" }, { status: 400 }),
        requestId,
      );
    }

    const membership = await prisma.familyMembership.findUnique({
      where: {
        familyId_userId: {
          familyId: invite.familyId,
          userId: authUser.userId,
        },
      },
    });

    const state = membership ? "already_member" : getInviteState(invite);

    const decision = await prisma.familyInviteDecision.upsert({
      where: {
        inviteId_userId: {
          inviteId: invite.id,
          userId: authUser.userId,
        },
      },
      create: {
        inviteId: invite.id,
        userId: authUser.userId,
        status: FamilyInviteDecisionStatus.pending,
      },
      update: {
        lastOpenedAt: new Date(),
      },
    });

    if (isPhase3Enabled()) {
      await recordMetric(prisma, {
        metricName: "invite_opened",
        requestId,
        actorUserId: authUser.userId,
        familyId: invite.familyId,
        inviteId: invite.id,
        statusCode: 200,
        metadata: { state },
      });
    }

    return withRequestId(NextResponse.json({
      invite: {
        id: invite.id,
        familyId: invite.familyId,
        state,
        expiresAt: invite.expiresAt,
        revokedAt: invite.revokedAt,
        consumedAt: invite.consumedAt,
        maxUses: invite.maxUses,
        usageType: getInviteUsageType(invite.maxUses),
        family: {
          id: invite.family.id,
          name: invite.family.name,
          description: invite.family.description,
          pictureStorageKey: invite.family.pictureStorageKey,
          pictureUrl: buildFamilyPictureUrl(invite.family.pictureStorageKey),
        },
        decision: {
          status: decision.status,
          firstOpenedAt: decision.firstOpenedAt,
          lastOpenedAt: decision.lastOpenedAt,
          decidedAt: decision.decidedAt,
        },
      },
    }), requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while resolving invite";
    return withRequestId(NextResponse.json({ error: message }, { status: 500 }), requestId);
  }
}
