import {
  FamilyDeletionRequestStatus,
  FamilyDeletionVoteValue,
  type FamilyDeletionRequest,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

const DELETION_APPROVAL_RATIO = 0.75;
const DELETION_REQUEST_EXPIRY_DAYS = 20;
const DELETION_REQUEST_COOLDOWN_DAYS = 7;

type DbClient = PrismaClient | Prisma.TransactionClient;

export function getDeletionRequiredApprovals(eligibleAdminCount: number) {
  return Math.ceil(eligibleAdminCount * DELETION_APPROVAL_RATIO);
}

export function getDeletionRequestExpiryDate(now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + DELETION_REQUEST_EXPIRY_DAYS);
  return expiresAt;
}

export function getDeletionCooldownUntil(now = new Date()) {
  const cooldownUntil = new Date(now);
  cooldownUntil.setUTCDate(cooldownUntil.getUTCDate() + DELETION_REQUEST_COOLDOWN_DAYS);
  return cooldownUntil;
}

export function serializeEligibleAdminUserIds(userIds: number[]) {
  const stable = [...new Set(userIds)].sort((a, b) => a - b);
  return JSON.stringify(stable);
}

export function parseEligibleAdminUserIds(eligibleAdminUserIdsJson: string) {
  try {
    const parsed = JSON.parse(eligibleAdminUserIdsJson) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is number => Number.isInteger(value) && value > 0);
  } catch {
    return [];
  }
}

export function isDeletionThresholdReached(approveCount: number, requiredApprovals: number) {
  return approveCount >= requiredApprovals;
}

export function isDeletionThresholdUnreachable(input: {
  approveCount: number;
  denyCount: number;
  eligibleAdminCount: number;
  requiredApprovals: number;
}) {
  const castVotes = input.approveCount + input.denyCount;
  const remainingVotes = Math.max(input.eligibleAdminCount - castVotes, 0);
  return input.approveCount + remainingVotes < input.requiredApprovals;
}

export async function setFamilyCooldownIfLater(prisma: DbClient, familyId: number, cooldownUntil: Date) {
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { deletionCooldownUntil: true },
  });

  if (!family) {
    return;
  }

  if (family.deletionCooldownUntil && family.deletionCooldownUntil >= cooldownUntil) {
    return;
  }

  await prisma.family.update({
    where: { id: familyId },
    data: { deletionCooldownUntil: cooldownUntil },
  });
}

export async function expireActiveDeletionRequests(prisma: DbClient, familyId?: number) {
  const now = new Date();
  const expired = await prisma.familyDeletionRequest.findMany({
    where: {
      status: FamilyDeletionRequestStatus.active,
      expiresAt: {
        lte: now,
      },
      ...(familyId ? { familyId } : {}),
    },
    select: {
      id: true,
      familyId: true,
    },
  });

  if (expired.length === 0) {
    return;
  }

  const cooldownUntil = getDeletionCooldownUntil(now);

  for (const request of expired) {
    await prisma.familyDeletionRequest.updateMany({
      where: {
        id: request.id,
        status: FamilyDeletionRequestStatus.active,
      },
      data: {
        status: FamilyDeletionRequestStatus.expired,
        resolvedAt: now,
        resolveReason: "expired",
      },
    });

    await setFamilyCooldownIfLater(prisma, request.familyId, cooldownUntil);
  }
}

export async function materializeDeletionRequest(
  prisma: DbClient,
  request: FamilyDeletionRequest,
) {
  const votes = await prisma.familyDeletionVote.findMany({
    where: { deletionRequestId: request.id },
    select: {
      userId: true,
      vote: true,
      votedAt: true,
    },
    orderBy: {
      votedAt: "asc",
    },
  });

  const eligibleAdminUserIds = parseEligibleAdminUserIds(request.eligibleAdminUserIdsJson);

  return {
    id: request.id,
    familyId: request.familyId,
    initiatedByUserId: request.initiatedByUserId,
    status: request.status,
    eligibleAdminCount: request.eligibleAdminCount,
    requiredApprovals: request.requiredApprovals,
    approveCount: request.approveCount,
    denyCount: request.denyCount,
    expiresAt: request.expiresAt,
    resolvedAt: request.resolvedAt,
    resolveReason: request.resolveReason,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    eligibleAdminUserIds,
    votes: votes.map((vote) => ({
      userId: vote.userId,
      vote: vote.vote,
      votedAt: vote.votedAt,
    })),
  };
}

export function normalizeVote(rawVote: unknown): FamilyDeletionVoteValue | null {
  if (rawVote === FamilyDeletionVoteValue.approve) {
    return FamilyDeletionVoteValue.approve;
  }

  if (rawVote === FamilyDeletionVoteValue.deny) {
    return FamilyDeletionVoteValue.deny;
  }

  return null;
}
