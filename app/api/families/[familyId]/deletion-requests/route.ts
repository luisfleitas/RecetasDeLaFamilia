import { parsePositiveInt } from "@/lib/application/families/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import {
  expireActiveDeletionRequests,
  getDeletionRequestExpiryDate,
  getDeletionRequiredApprovals,
  materializeDeletionRequest,
  serializeEligibleAdminUserIds,
} from "@/lib/families/deletion-requests";
import { isFamilyAdmin } from "@/lib/families/utils";
import { isPhase3Enabled } from "@/lib/phase3/config";
import { getRequestId, recordAuditEvent, recordMetric, withRequestId } from "@/lib/phase3/observability";
import { getPrisma } from "@/lib/prisma";
import { FamilyDeletionRequestStatus, FamilyDeletionVoteValue, FamilyRole } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ familyId: string }>;
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
    const admin = await isFamilyAdmin(prisma, familyId, authUser.userId);

    if (!admin) {
      return withRequestId(
        NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 }),
        requestId,
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await expireActiveDeletionRequests(tx, familyId);

      const family = await tx.family.findUnique({
        where: { id: familyId },
        select: {
          id: true,
          deletionCooldownUntil: true,
        },
      });

      if (!family) {
        return {
          kind: "error" as const,
          status: 404,
          payload: {
            error: "Family not found",
            code: "NOT_FOUND",
          },
        };
      }

      if (family.deletionCooldownUntil && family.deletionCooldownUntil > new Date()) {
        return {
          kind: "error" as const,
          status: 409,
          payload: {
            error: "Deletion request cooldown is active",
            code: "DELETION_REQUEST_COOLDOWN",
            cooldownUntil: family.deletionCooldownUntil,
          },
        };
      }

      const activeRequest = await tx.familyDeletionRequest.findFirst({
        where: {
          familyId,
          status: FamilyDeletionRequestStatus.active,
        },
      });

      if (activeRequest) {
        return {
          kind: "error" as const,
          status: 409,
          payload: {
            error: "An active deletion request already exists",
            code: "DELETION_REQUEST_ACTIVE",
          },
        };
      }

      const admins = await tx.familyMembership.findMany({
        where: {
          familyId,
          role: FamilyRole.admin,
        },
        select: {
          userId: true,
        },
      });

      if (admins.length === 0) {
        return {
          kind: "error" as const,
          status: 409,
          payload: {
            error: "Family has no admins",
            code: "ADMIN_INVARIANT_VIOLATION",
          },
        };
      }

      const eligibleAdminUserIds = admins.map((item) => item.userId);
      const requiredApprovals = getDeletionRequiredApprovals(eligibleAdminUserIds.length);
      const now = new Date();
      const expiresAt = getDeletionRequestExpiryDate(now);

      const createdRequest = await tx.familyDeletionRequest.create({
        data: {
          familyId,
          initiatedByUserId: authUser.userId,
          status: FamilyDeletionRequestStatus.active,
          eligibleAdminCount: eligibleAdminUserIds.length,
          requiredApprovals,
          eligibleAdminUserIdsJson: serializeEligibleAdminUserIds(eligibleAdminUserIds),
          approveCount: 1,
          denyCount: 0,
          expiresAt,
        },
      });

      await tx.familyDeletionVote.create({
        data: {
          deletionRequestId: createdRequest.id,
          userId: authUser.userId,
          vote: FamilyDeletionVoteValue.approve,
        },
      });

      if (requiredApprovals <= 1) {
        await tx.family.delete({
          where: { id: familyId },
        });

        return {
          kind: "deleted" as const,
          status: 200,
          payload: {
            ok: true,
            deletedFamily: true,
            requestResolved: "approved",
          },
        };
      }

      const responseRequest = await materializeDeletionRequest(tx, createdRequest);

      return {
        kind: "active" as const,
        status: 201,
        payload: {
          request: responseRequest,
        },
      };
    });

    if (isPhase3Enabled()) {
      await recordAuditEvent(prisma, {
        eventType: "family_deletion_request_created",
        requestId,
        actorUserId: authUser.userId,
        familyId,
      });
      await recordMetric(prisma, {
        metricName: "family_deletion_request_created",
        requestId,
        actorUserId: authUser.userId,
        familyId,
        statusCode: result.status,
      });
    }

    return withRequestId(NextResponse.json(result.payload, { status: result.status }), requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while creating deletion request";
    return withRequestId(NextResponse.json({ error: message }, { status: 500 }), requestId);
  }
}
