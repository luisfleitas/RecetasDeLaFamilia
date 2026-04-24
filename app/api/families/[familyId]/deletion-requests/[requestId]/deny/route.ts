import { parsePositiveInt } from "@/lib/application/families/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { submitDeletionVote } from "@/lib/families/deletion-actions";
import { isFamilyAdmin } from "@/lib/families/utils";
import { isPhase3Enabled } from "@/lib/phase3/config";
import { getRequestId, recordAuditEvent, recordMetric, withRequestId } from "@/lib/phase3/observability";
import { getPrisma } from "@/lib/prisma";
import { FamilyDeletionVoteValue } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ familyId: string; requestId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const requestIdHeader = getRequestId(request);
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return withRequestId(
      NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 }),
      requestIdHeader,
    );
  }

  const { familyId: familyIdParam, requestId: deletionRequestIdParam } = await params;
  const familyId = parsePositiveInt(familyIdParam);
  const deletionRequestId = parsePositiveInt(deletionRequestIdParam);

  if (!familyId || !deletionRequestId) {
    return withRequestId(
      NextResponse.json({ error: "Invalid family or request id", code: "VALIDATION_ERROR" }, { status: 400 }),
      requestIdHeader,
    );
  }

  try {
    const prisma = await getPrisma();
    const admin = await isFamilyAdmin(prisma, familyId, authUser.userId);

    if (!admin) {
      return withRequestId(
        NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 }),
        requestIdHeader,
      );
    }

    const result = await submitDeletionVote({
      prisma,
      familyId,
      requestId: deletionRequestId,
      userId: authUser.userId,
      vote: FamilyDeletionVoteValue.deny,
    });

    if (isPhase3Enabled()) {
      await recordAuditEvent(prisma, {
        eventType: "family_deletion_request_vote_denied",
        requestId: requestIdHeader,
        actorUserId: authUser.userId,
        familyId: familyId,
      });
      await recordMetric(prisma, {
        metricName: "family_deletion_request_vote_denied",
        requestId: requestIdHeader,
        actorUserId: authUser.userId,
        familyId,
        statusCode: result.metricStatusCode,
      });
    }

    return withRequestId(NextResponse.json(result.payload, { status: result.status }), requestIdHeader);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while denying deletion request";
    return withRequestId(NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 }), requestIdHeader);
  }
}
