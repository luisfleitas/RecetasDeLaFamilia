import {
  buildFamilyPictureUrl,
  createFamilyInviteToken,
  getInviteExpiryDate,
  getInviteState,
  getInviteUsageType,
  hashFamilyInviteToken,
  isFamilyAdmin,
  SINGLE_USE_INVITE_MAX_USES,
} from "@/lib/families/utils";
import { FamilyInviteDecisionStatus, FamilyRole, Prisma, type PrismaClient } from "@prisma/client";

export type DirectInviteErrorCode =
  | "FORBIDDEN"
  | "USER_NOT_FOUND"
  | "ALREADY_MEMBER"
  | "DUPLICATE_PENDING_DIRECT_INVITE"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INVITE_REVOKED"
  | "INVITE_CONSUMED"
  | "INVITE_EXPIRED"
  | "INVITE_TARGET_MISMATCH";

export class DirectInviteError extends Error {
  readonly code: DirectInviteErrorCode;

  constructor(code: DirectInviteErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export type UsernameDirectInviteResult = {
  invite: {
    id: number;
    familyId: number;
    createdByUserId: number;
    targetUserId: number;
    targetUsername: string;
    inviteType: "direct";
    createdAt: Date;
    expiresAt: Date;
    revokedAt: Date | null;
    consumedAt: Date | null;
    consumedByUserId: number | null;
    maxUses: number;
    usageType: "single_use";
    state: "active" | "revoked" | "consumed" | "expired";
    inviteUrl: string;
  };
};

export type PendingInviteAction = "accept" | "decline" | "undo-decline";

export function isTargetedInviteMismatch(invite: { inviteType?: string; targetUserId?: number | null }, userId: number) {
  return invite.inviteType === "direct" && invite.targetUserId !== userId;
}

export function assertCanUseTargetedInvite(invite: { inviteType?: string; targetUserId?: number | null }, userId: number) {
  if (isTargetedInviteMismatch(invite, userId)) {
    throw new DirectInviteError("INVITE_TARGET_MISMATCH", "Invite is targeted to another user");
  }
}

export async function createUsernameDirectInvite({
  prisma,
  familyId,
  actorUserId,
  username,
  origin,
  now = new Date(),
}: {
  prisma: PrismaClient;
  familyId: number;
  actorUserId: number;
  username: string;
  origin: string;
  now?: Date;
}): Promise<UsernameDirectInviteResult> {
  const admin = await isFamilyAdmin(prisma, familyId, actorUserId);
  if (!admin) {
    throw new DirectInviteError("FORBIDDEN", "Forbidden");
  }

  const targetUser = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
      username: true,
    },
  });

  if (!targetUser) {
    throw new DirectInviteError("USER_NOT_FOUND", "User not found");
  }

  const existingMembership = await prisma.familyMembership.findUnique({
    where: {
      familyId_userId: {
        familyId,
        userId: targetUser.id,
      },
    },
  });

  if (existingMembership) {
    throw new DirectInviteError("ALREADY_MEMBER", "User is already a family member");
  }

  const duplicateInvite = await prisma.familyInvite.findFirst({
    where: {
      familyId,
      inviteType: "direct",
      targetUserId: targetUser.id,
      revokedAt: null,
      consumedAt: null,
      expiresAt: {
        gt: now,
      },
      decisions: {
        some: {
          userId: targetUser.id,
          status: FamilyInviteDecisionStatus.pending,
        },
      },
    },
  });

  if (duplicateInvite) {
    throw new DirectInviteError(
      "DUPLICATE_PENDING_DIRECT_INVITE",
      "A pending direct invite already exists for this user",
    );
  }

  const token = createFamilyInviteToken();
  const invite = await prisma.familyInvite.create({
    data: {
      familyId,
      tokenHash: hashFamilyInviteToken(token),
      createdByUserId: actorUserId,
      expiresAt: getInviteExpiryDate(now),
      maxUses: SINGLE_USE_INVITE_MAX_USES,
      inviteType: "direct",
      targetUserId: targetUser.id,
      decisions: {
        create: {
          userId: targetUser.id,
          status: FamilyInviteDecisionStatus.pending,
        },
      },
    },
  });

  return {
    invite: {
      id: invite.id,
      familyId: invite.familyId,
      createdByUserId: invite.createdByUserId,
      targetUserId: targetUser.id,
      targetUsername: targetUser.username,
      inviteType: "direct",
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      revokedAt: invite.revokedAt,
      consumedAt: invite.consumedAt,
      consumedByUserId: invite.consumedByUserId,
      maxUses: invite.maxUses,
      usageType: "single_use",
      state: getInviteState(invite),
      inviteUrl: `${origin}/invite/family/${token}`,
    },
  };
}

export async function revokeUsernameDirectInvite({
  prisma,
  familyId,
  inviteId,
  actorUserId,
}: {
  prisma: PrismaClient;
  familyId: number;
  inviteId: number;
  actorUserId: number;
}) {
  const admin = await isFamilyAdmin(prisma, familyId, actorUserId);
  if (!admin) {
    throw new DirectInviteError("FORBIDDEN", "Forbidden");
  }

  const invite = await prisma.familyInvite.findFirst({
    where: {
      id: inviteId,
      familyId,
      inviteType: "direct",
    },
    include: {
      targetUser: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!invite) {
    throw new DirectInviteError("NOT_FOUND", "Direct invite not found");
  }

  const nextInvite = invite.revokedAt
    ? invite
    : await prisma.familyInvite.update({
        where: { id: invite.id },
        data: { revokedAt: new Date() },
        include: {
          targetUser: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

  return {
    invite: {
      id: nextInvite.id,
      familyId: nextInvite.familyId,
      createdByUserId: nextInvite.createdByUserId,
      targetUserId: nextInvite.targetUserId,
      targetUsername: nextInvite.targetUser?.username ?? null,
      inviteType: "direct" as const,
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
  };
}

export async function listUsernameDirectInvitesForFamily({
  prisma,
  familyId,
  actorUserId,
}: {
  prisma: PrismaClient;
  familyId: number;
  actorUserId: number;
}) {
  const admin = await isFamilyAdmin(prisma, familyId, actorUserId);
  if (!admin) {
    throw new DirectInviteError("FORBIDDEN", "Forbidden");
  }

  const invites = await prisma.familyInvite.findMany({
    where: {
      familyId,
      inviteType: "direct",
    },
    include: {
      targetUser: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return invites.map((invite) => ({
    id: invite.id,
    familyId: invite.familyId,
    createdByUserId: invite.createdByUserId,
    targetUserId: invite.targetUserId,
    targetUsername: invite.targetUser?.username ?? null,
    inviteType: "direct" as const,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    revokedAt: invite.revokedAt,
    consumedAt: invite.consumedAt,
    consumedByUserId: invite.consumedByUserId,
    maxUses: invite.maxUses,
    usageType: getInviteUsageType(invite.maxUses),
    state: getInviteState(invite),
  }));
}

function inviteStateErrorCode(state: string): DirectInviteErrorCode {
  if (state === "revoked") {
    return "INVITE_REVOKED";
  }

  if (state === "consumed") {
    return "INVITE_CONSUMED";
  }

  return "INVITE_EXPIRED";
}

export async function applyPendingInviteAction({
  prisma,
  inviteId,
  userId,
  action,
  now = new Date(),
}: {
  prisma: PrismaClient;
  inviteId: number;
  userId: number;
  action: PendingInviteAction;
  now?: Date;
}) {
  const invite = await prisma.familyInvite.findUnique({
    where: {
      id: inviteId,
    },
  });

  if (!invite) {
    throw new DirectInviteError("NOT_FOUND", "Invite not found");
  }

  assertCanUseTargetedInvite(invite, userId);

  const decision = await prisma.familyInviteDecision.findUnique({
    where: {
      inviteId_userId: {
        inviteId,
        userId,
      },
    },
  });

  if (!decision) {
    throw new DirectInviteError("NOT_FOUND", "Invite decision not found");
  }

  const state = getInviteState(invite);
  if (state !== "active" && action !== "accept") {
    throw new DirectInviteError(inviteStateErrorCode(state), "Invite is not active");
  }

  if (action === "decline") {
    return {
      decision: await prisma.familyInviteDecision.update({
        where: {
          id: decision.id,
        },
        data: {
          status: FamilyInviteDecisionStatus.declined,
          decidedAt: now,
        },
      }),
    };
  }

  if (action === "undo-decline") {
    if (decision.status !== FamilyInviteDecisionStatus.declined) {
      throw new DirectInviteError("VALIDATION_ERROR", "Invite is not declined");
    }

    return {
      decision: await prisma.familyInviteDecision.update({
        where: {
          id: decision.id,
        },
        data: {
          status: FamilyInviteDecisionStatus.pending,
          decidedAt: null,
          lastOpenedAt: now,
        },
      }),
    };
  }

  const existingMembership = await prisma.familyMembership.findUnique({
    where: {
      familyId_userId: {
        familyId: invite.familyId,
        userId,
      },
    },
  });

  if (existingMembership) {
    return {
      decision: await prisma.familyInviteDecision.update({
        where: {
          id: decision.id,
        },
        data: {
          status: FamilyInviteDecisionStatus.accepted,
          decidedAt: now,
          lastOpenedAt: now,
        },
      }),
      code: "ALREADY_MEMBER" as const,
    };
  }

  if (state !== "active") {
    throw new DirectInviteError(inviteStateErrorCode(state), "Invite is not active");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const inviteInTx = await tx.familyInvite.findUnique({
        where: {
          id: invite.id,
        },
      });

      if (!inviteInTx || getInviteState(inviteInTx) !== "active") {
        throw new DirectInviteError("VALIDATION_ERROR", "Invite is no longer active");
      }

      if (inviteInTx.maxUses === SINGLE_USE_INVITE_MAX_USES) {
        await tx.familyInvite.update({
          where: {
            id: invite.id,
          },
          data: {
            consumedAt: now,
            consumedByUserId: userId,
          },
        });
      }

      await tx.familyMembership.create({
        data: {
          familyId: invite.familyId,
          userId,
          role: FamilyRole.member,
        },
      });

      const nextDecision = await tx.familyInviteDecision.update({
        where: {
          id: decision.id,
        },
        data: {
          status: FamilyInviteDecisionStatus.accepted,
          decidedAt: now,
          lastOpenedAt: now,
        },
      });

      return { decision: nextDecision };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        decision: await prisma.familyInviteDecision.update({
          where: {
            id: decision.id,
          },
          data: {
            status: FamilyInviteDecisionStatus.accepted,
            decidedAt: now,
            lastOpenedAt: now,
          },
        }),
        code: "ALREADY_MEMBER" as const,
      };
    }

    throw error;
  }
}

export function directInviteErrorStatus(code: DirectInviteErrorCode) {
  switch (code) {
    case "FORBIDDEN":
    case "INVITE_TARGET_MISMATCH":
      return 403;
    case "USER_NOT_FOUND":
    case "NOT_FOUND":
      return 404;
    case "ALREADY_MEMBER":
    case "DUPLICATE_PENDING_DIRECT_INVITE":
    case "INVITE_REVOKED":
    case "INVITE_CONSUMED":
    case "INVITE_EXPIRED":
      return 409;
    case "VALIDATION_ERROR":
      return 400;
  }
}

export async function listPendingInvitesForUser({
  prisma,
  userId,
  status,
}: {
  prisma: PrismaClient;
  userId: number;
  status?: FamilyInviteDecisionStatus | null;
}) {
  const decisions = await prisma.familyInviteDecision.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
    include: {
      invite: {
        include: {
          family: true,
          targetUser: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return decisions
    .map((decision) => {
      const inviteState = getInviteState(decision.invite);

      if (status === FamilyInviteDecisionStatus.pending && inviteState !== "active") {
        return null;
      }

      return {
        inviteId: decision.inviteId,
        decisionStatus: decision.status,
        firstOpenedAt: decision.firstOpenedAt,
        lastOpenedAt: decision.lastOpenedAt,
        decidedAt: decision.decidedAt,
        invite: {
          id: decision.invite.id,
          familyId: decision.invite.familyId,
          createdAt: decision.invite.createdAt,
          expiresAt: decision.invite.expiresAt,
          state: inviteState,
          inviteType: decision.invite.inviteType,
          targetUserId: decision.invite.targetUserId,
          targetUsername: decision.invite.targetUser?.username ?? null,
        },
        family: {
          id: decision.invite.family.id,
          name: decision.invite.family.name,
          description: decision.invite.family.description,
          pictureStorageKey: decision.invite.family.pictureStorageKey,
          pictureUrl: buildFamilyPictureUrl(decision.invite.family.pictureStorageKey),
        },
      };
    })
    .filter((item) => item !== null);
}
