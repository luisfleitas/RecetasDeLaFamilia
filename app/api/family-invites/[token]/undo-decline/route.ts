import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import {
  getInviteState,
  hashFamilyInviteToken,
} from "@/lib/families/utils";
import { isPhase3Enabled } from "@/lib/phase3/config";
import { getRequestId, recordMetric, withRequestId } from "@/lib/phase3/observability";
import { getPrisma } from "@/lib/prisma";
import { FamilyInviteDecisionStatus } from "@prisma/client";
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
      where: {
        tokenHash,
      },
    });

    if (!invite) {
      return withRequestId(
        NextResponse.json({ error: "Invalid invite token", code: "INVITE_INVALID" }, { status: 400 }),
        requestId,
      );
    }

    const state = getInviteState(invite);
    if (state !== "active") {
      return withRequestId(
        NextResponse.json(
          {
            error: "Invite can only be reopened while active",
            code:
              state === "revoked"
                ? "INVITE_REVOKED"
                : state === "consumed"
                  ? "INVITE_CONSUMED"
                  : "INVITE_EXPIRED",
          },
          { status: 409 },
        ),
        requestId,
      );
    }

    const decision = await prisma.familyInviteDecision.findUnique({
      where: {
        inviteId_userId: {
          inviteId: invite.id,
          userId: authUser.userId,
        },
      },
    });

    if (!decision || decision.status !== FamilyInviteDecisionStatus.declined) {
      return withRequestId(
        NextResponse.json(
          {
            error: "Invite is not declined",
            code: "VALIDATION_ERROR",
          },
          { status: 400 },
        ),
        requestId,
      );
    }

    const updated = await prisma.familyInviteDecision.update({
      where: {
        id: decision.id,
      },
      data: {
        status: FamilyInviteDecisionStatus.pending,
        decidedAt: null,
        lastOpenedAt: new Date(),
      },
    });

    if (isPhase3Enabled()) {
      await recordMetric(prisma, {
        metricName: "invite_decline_undone",
        requestId,
        actorUserId: authUser.userId,
        familyId: invite.familyId,
        inviteId: invite.id,
        statusCode: 200,
      });
    }

    return withRequestId(NextResponse.json({ decision: updated }), requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while undoing decline";
    return withRequestId(NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 }), requestId);
  }
}
