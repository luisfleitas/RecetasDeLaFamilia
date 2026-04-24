import { parsePositiveInt } from "@/lib/application/families/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { getInviteState, getInviteUsageType, isFamilyAdmin } from "@/lib/families/utils";
import { isPhase3Enabled } from "@/lib/phase3/config";
import { getRequestId, recordMetric, withRequestId } from "@/lib/phase3/observability";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ familyId: string; inviteId: string }>;
};

export async function DELETE(request: Request, { params }: Params) {
  const requestId = getRequestId(request);
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return withRequestId(
      NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 }),
      requestId,
    );
  }

  const { familyId: familyIdParam, inviteId: inviteIdParam } = await params;
  const familyId = parsePositiveInt(familyIdParam);
  const inviteId = parsePositiveInt(inviteIdParam);

  if (!familyId || !inviteId) {
    return withRequestId(
      NextResponse.json({ error: "Invalid family or invite id", code: "VALIDATION_ERROR" }, { status: 400 }),
      requestId,
    );
  }

  try {
    const prisma = await getPrisma();
    const admin = await isFamilyAdmin(prisma, familyId, authUser.userId);

    if (!admin) {
      return withRequestId(
        NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 }),
        requestId,
      );
    }

    const invite = await prisma.familyInvite.findFirst({
      where: {
        id: inviteId,
        familyId,
      },
    });

    if (!invite) {
      return withRequestId(
        NextResponse.json({ error: "Invite not found", code: "NOT_FOUND" }, { status: 404 }),
        requestId,
      );
    }

    const nextInvite = invite.revokedAt
      ? invite
      : await prisma.familyInvite.update({
          where: { id: invite.id },
          data: { revokedAt: new Date() },
        });

    if (isPhase3Enabled() && !invite.revokedAt) {
      await recordMetric(prisma, {
        metricName: "invite_revoked",
        requestId,
        actorUserId: authUser.userId,
        familyId,
        inviteId: invite.id,
        statusCode: 200,
      });
    }

    return withRequestId(NextResponse.json({
      invite: {
        id: nextInvite.id,
        familyId: nextInvite.familyId,
        createdByUserId: nextInvite.createdByUserId,
        createdAt: nextInvite.createdAt,
        expiresAt: nextInvite.expiresAt,
        revokedAt: nextInvite.revokedAt,
        consumedAt: nextInvite.consumedAt,
        consumedByUserId: nextInvite.consumedByUserId,
        maxUses: nextInvite.maxUses,
        usageType: getInviteUsageType(nextInvite.maxUses),
        state: getInviteState(nextInvite),
      },
      idempotent: Boolean(invite.revokedAt),
    }), requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while revoking invite";
    return withRequestId(NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 }), requestId);
  }
}
