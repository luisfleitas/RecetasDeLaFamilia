import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { hashFamilyInviteToken } from "@/lib/families/utils";
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

    const decision = await prisma.familyInviteDecision.findUnique({
      where: {
        inviteId_userId: {
          inviteId: invite.id,
          userId: authUser.userId,
        },
      },
    });

    if (!decision) {
      return withRequestId(
        NextResponse.json({
          error: "Invite must be opened before it can be declined",
          code: "VALIDATION_ERROR",
        }, { status: 400 }),
        requestId,
      );
    }

    const updated = await prisma.familyInviteDecision.update({
      where: {
        id: decision.id,
      },
      data: {
        status: FamilyInviteDecisionStatus.declined,
        decidedAt: new Date(),
      },
    });

    if (isPhase3Enabled()) {
      await recordMetric(prisma, {
        metricName: "invite_declined",
        requestId,
        actorUserId: authUser.userId,
        familyId: invite.familyId,
        inviteId: invite.id,
        statusCode: 200,
      });
    }

    return withRequestId(NextResponse.json({ decision: updated }), requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while declining invite";
    return withRequestId(NextResponse.json({ error: message }, { status: 500 }), requestId);
  }
}
