import { parsePositiveInt } from "@/lib/application/families/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { expireActiveDeletionRequests, materializeDeletionRequest } from "@/lib/families/deletion-requests";
import { getFamilyMembership } from "@/lib/families/utils";
import { getRequestId, withRequestId } from "@/lib/phase3/observability";
import { getPrisma } from "@/lib/prisma";
import { FamilyDeletionRequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ familyId: string }>;
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

  const { familyId: familyIdParam } = await params;
  const familyId = parsePositiveInt(familyIdParam);

  if (!familyId) {
    return withRequestId(
      NextResponse.json({ error: "Invalid family id", code: "VALIDATION_ERROR" }, { status: 400 }),
      requestId,
    );
  }

  try {
    const prisma = await getPrisma();
    const membership = await getFamilyMembership(prisma, familyId, authUser.userId);

    if (!membership) {
      return withRequestId(
        NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 }),
        requestId,
      );
    }

    await prisma.$transaction(async (tx) => {
      await expireActiveDeletionRequests(tx, familyId);
    });

    const [family, activeRequest] = await Promise.all([
      prisma.family.findUnique({
        where: { id: familyId },
        select: {
          id: true,
          deletionCooldownUntil: true,
        },
      }),
      prisma.familyDeletionRequest.findFirst({
        where: {
          familyId,
          status: FamilyDeletionRequestStatus.active,
        },
      }),
    ]);

    if (!family) {
      return withRequestId(
        NextResponse.json({ error: "Family not found", code: "NOT_FOUND" }, { status: 404 }),
        requestId,
      );
    }

    if (!activeRequest) {
      return withRequestId(
        NextResponse.json({ request: null, cooldownUntil: family.deletionCooldownUntil }),
        requestId,
      );
    }

    const requestData = await materializeDeletionRequest(prisma, activeRequest);

    return withRequestId(
      NextResponse.json({ request: requestData, cooldownUntil: family.deletionCooldownUntil }),
      requestId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while loading active deletion request";
    return withRequestId(NextResponse.json({ error: message }, { status: 500 }), requestId);
  }
}
