import {
  FamilyDeletionRequestStatus,
  FamilyDeletionVoteValue,
  type PrismaClient,
} from "@prisma/client";
import {
  expireActiveDeletionRequests,
  getDeletionCooldownUntil,
  isDeletionThresholdReached,
  isDeletionThresholdUnreachable,
  materializeDeletionRequest,
  parseEligibleAdminUserIds,
  setFamilyCooldownIfLater,
} from "@/lib/families/deletion-requests";

type ActionResult = {
  status: number;
  payload: Record<string, unknown>;
  metricStatusCode: number;
  familyDeleted: boolean;
};

export async function submitDeletionVote(input: {
  prisma: PrismaClient;
  familyId: number;
  requestId: number;
  userId: number;
  vote: FamilyDeletionVoteValue;
}): Promise<ActionResult> {
  const { prisma, familyId, requestId, userId, vote } = input;

  return prisma.$transaction(async (tx) => {
    await expireActiveDeletionRequests(tx, familyId);

    const request = await tx.familyDeletionRequest.findFirst({
      where: {
        id: requestId,
        familyId,
      },
    });

    if (!request) {
      return {
        status: 404,
        metricStatusCode: 404,
        familyDeleted: false,
        payload: {
          error: "Deletion request not found",
          code: "NOT_FOUND",
        },
      };
    }

    if (request.status !== FamilyDeletionRequestStatus.active) {
      return {
        status: 409,
        metricStatusCode: 409,
        familyDeleted: false,
        payload: {
          error: request.status === FamilyDeletionRequestStatus.expired
            ? "Deletion request is expired"
            : "Deletion request is not active",
          code: request.status === FamilyDeletionRequestStatus.expired
            ? "DELETION_REQUEST_EXPIRED"
            : "CONFLICT",
        },
      };
    }

    const eligibleAdminUserIds = parseEligibleAdminUserIds(request.eligibleAdminUserIdsJson);
    if (!eligibleAdminUserIds.includes(userId)) {
      return {
        status: 403,
        metricStatusCode: 403,
        familyDeleted: false,
        payload: {
          error: "User is not eligible to vote on this request",
          code: "DELETION_REQUEST_NOT_ELIGIBLE",
        },
      };
    }

    try {
      await tx.familyDeletionVote.create({
        data: {
          deletionRequestId: request.id,
          userId,
          vote,
        },
      });
    } catch {
      return {
        status: 409,
        metricStatusCode: 409,
        familyDeleted: false,
        payload: {
          error: "Vote already recorded",
          code: "DELETION_REQUEST_ALREADY_VOTED",
        },
      };
    }

    const [approveCount, denyCount] = await Promise.all([
      tx.familyDeletionVote.count({
        where: {
          deletionRequestId: request.id,
          vote: FamilyDeletionVoteValue.approve,
        },
      }),
      tx.familyDeletionVote.count({
        where: {
          deletionRequestId: request.id,
          vote: FamilyDeletionVoteValue.deny,
        },
      }),
    ]);

    if (isDeletionThresholdReached(approveCount, request.requiredApprovals)) {
      await tx.family.delete({
        where: {
          id: familyId,
        },
      });

      return {
        status: 200,
        metricStatusCode: 200,
        familyDeleted: true,
        payload: {
          ok: true,
          deletedFamily: true,
          requestResolved: "approved",
        },
      };
    }

    if (isDeletionThresholdUnreachable({
      approveCount,
      denyCount,
      eligibleAdminCount: request.eligibleAdminCount,
      requiredApprovals: request.requiredApprovals,
    })) {
      const now = new Date();
      const deniedRequest = await tx.familyDeletionRequest.update({
        where: {
          id: request.id,
        },
        data: {
          status: FamilyDeletionRequestStatus.denied,
          approveCount,
          denyCount,
          resolvedAt: now,
          resolveReason: "threshold_unreachable",
        },
      });

      await setFamilyCooldownIfLater(tx, familyId, getDeletionCooldownUntil(now));

      return {
        status: 200,
        metricStatusCode: 200,
        familyDeleted: false,
        payload: {
          request: await materializeDeletionRequest(tx, deniedRequest),
          requestResolved: "denied",
        },
      };
    }

    const updatedRequest = await tx.familyDeletionRequest.update({
      where: {
        id: request.id,
      },
      data: {
        approveCount,
        denyCount,
      },
    });

    return {
      status: 200,
      metricStatusCode: 200,
      familyDeleted: false,
      payload: {
        request: await materializeDeletionRequest(tx, updatedRequest),
      },
    };
  });
}

export async function cancelDeletionRequest(input: {
  prisma: PrismaClient;
  familyId: number;
  requestId: number;
  userId: number;
}): Promise<ActionResult> {
  const { prisma, familyId, requestId, userId } = input;

  return prisma.$transaction(async (tx) => {
    await expireActiveDeletionRequests(tx, familyId);

    const request = await tx.familyDeletionRequest.findFirst({
      where: {
        id: requestId,
        familyId,
      },
    });

    if (!request) {
      return {
        status: 404,
        metricStatusCode: 404,
        familyDeleted: false,
        payload: {
          error: "Deletion request not found",
          code: "NOT_FOUND",
        },
      };
    }

    if (request.status !== FamilyDeletionRequestStatus.active) {
      return {
        status: 409,
        metricStatusCode: 409,
        familyDeleted: false,
        payload: {
          error: request.status === FamilyDeletionRequestStatus.expired
            ? "Deletion request is expired"
            : "Deletion request is not active",
          code: request.status === FamilyDeletionRequestStatus.expired
            ? "DELETION_REQUEST_EXPIRED"
            : "CONFLICT",
        },
      };
    }

    if (request.initiatedByUserId !== userId) {
      return {
        status: 403,
        metricStatusCode: 403,
        familyDeleted: false,
        payload: {
          error: "Only the initiating admin can cancel this request",
          code: "DELETION_REQUEST_NOT_INITIATOR",
        },
      };
    }

    const now = new Date();
    const cancelledRequest = await tx.familyDeletionRequest.update({
      where: { id: request.id },
      data: {
        status: FamilyDeletionRequestStatus.cancelled,
        resolvedAt: now,
        resolveReason: "cancelled_by_initiator",
      },
    });

    return {
      status: 200,
      metricStatusCode: 200,
      familyDeleted: false,
      payload: {
        request: await materializeDeletionRequest(tx, cancelledRequest),
      },
    };
  });
}
