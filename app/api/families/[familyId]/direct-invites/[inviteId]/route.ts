import {
  DirectInviteError,
  directInviteErrorStatus,
  revokeUsernameDirectInvite,
} from "@/lib/application/families/direct-invites";
import { parsePositiveInt } from "@/lib/application/families/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
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
  const authUser = await getAuthUserFromRequest(request);

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
    const result = await revokeUsernameDirectInvite({
      prisma,
      familyId,
      inviteId,
      actorUserId: authUser.userId,
    });

    if (isPhase3Enabled() && !result.idempotent) {
      await recordMetric(prisma, {
        metricName: "direct_invite_revoked",
        requestId,
        actorUserId: authUser.userId,
        familyId,
        inviteId,
        statusCode: 200,
      });
    }

    return withRequestId(NextResponse.json(result), requestId);
  } catch (error) {
    if (error instanceof DirectInviteError) {
      return withRequestId(
        NextResponse.json({ error: error.message, code: error.code }, { status: directInviteErrorStatus(error.code) }),
        requestId,
      );
    }

    const message = error instanceof Error ? error.message : "Unexpected error while revoking direct invite";
    return withRequestId(NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 }), requestId);
  }
}
