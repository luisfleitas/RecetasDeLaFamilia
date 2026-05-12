import { createUsernameDirectInvite } from "@/lib/application/families/direct-invites";
import type { CreateFamilyInput, CreateFamilyStagedInviteInput } from "@/lib/application/families/validation";
import {
  createFamilyInviteToken,
  getInviteExpiryDate,
  hashFamilyInviteToken,
  MULTI_USE_INVITE_MAX_USES,
  SINGLE_USE_INVITE_MAX_USES,
} from "@/lib/families/utils";
import { FamilyRole, type PrismaClient } from "@prisma/client";

export type CreateFamilyInviteResult = {
  inviteId: string;
  inviteRecordId?: number;
  inviteType: "direct" | "link";
  inviteUrl?: string;
  message?: string;
  ok: boolean;
};

export type CreateFamilySubmissionResult = {
  completion: {
    failedInvites: { inviteId: string; message: string }[];
    inviteResults: CreateFamilyInviteResult[];
    status: "success" | "warning";
  };
  family: {
    id: number;
    name: string;
    description: string | null;
    pictureStorageKey: string | null;
    createdAt: Date;
    updatedAt: Date;
    role: FamilyRole;
  };
};

async function createLinkInvite({
  prisma,
  familyId,
  actorUserId,
  invite,
  origin,
}: {
  prisma: PrismaClient;
  familyId: number;
  actorUserId: number;
  invite: Extract<CreateFamilyStagedInviteInput, { kind: "link" }>;
  origin: string;
}): Promise<CreateFamilyInviteResult> {
  const token = createFamilyInviteToken();
  const maxUses = invite.usageType === "single_use" ? SINGLE_USE_INVITE_MAX_USES : MULTI_USE_INVITE_MAX_USES;
  const record = await prisma.familyInvite.create({
    data: {
      familyId,
      tokenHash: hashFamilyInviteToken(token),
      createdByUserId: actorUserId,
      expiresAt: getInviteExpiryDate(),
      maxUses,
      inviteType: "link",
    },
  });

  return {
    inviteId: invite.id,
    inviteRecordId: record.id,
    inviteType: "link",
    inviteUrl: `${origin}/invite/family/${token}`,
    ok: true,
  };
}

async function createStagedInvite({
  prisma,
  familyId,
  actorUserId,
  invite,
  origin,
}: {
  prisma: PrismaClient;
  familyId: number;
  actorUserId: number;
  invite: CreateFamilyStagedInviteInput;
  origin: string;
}): Promise<CreateFamilyInviteResult> {
  try {
    if (invite.kind === "link") {
      return await createLinkInvite({ prisma, familyId, actorUserId, invite, origin });
    }

    const result = await createUsernameDirectInvite({
      prisma,
      familyId,
      actorUserId,
      username: invite.username,
      origin,
    });

    return {
      inviteId: invite.id,
      inviteRecordId: result.invite.id,
      inviteType: "direct",
      inviteUrl: result.invite.inviteUrl,
      ok: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invite could not be created";
    const inviteType = invite.kind === "link" ? "link" : "direct";

    return {
      inviteId: invite.id,
      inviteType,
      message,
      ok: false,
    };
  }
}

export async function submitCreateFamily({
  prisma,
  actorUserId,
  input,
  origin,
}: {
  prisma: PrismaClient;
  actorUserId: number;
  input: CreateFamilyInput;
  origin: string;
}): Promise<CreateFamilySubmissionResult> {
  const family = await prisma.$transaction(async (tx) => {
    const createdFamily = await tx.family.create({
      data: {
        name: input.name,
        description: input.description,
        pictureStorageKey: input.pictureStorageKey,
        createdByUserId: actorUserId,
      },
    });

    await tx.familyMembership.create({
      data: {
        familyId: createdFamily.id,
        userId: actorUserId,
        role: FamilyRole.admin,
      },
    });

    return createdFamily;
  });

  // Invite records are created after the family exists so partial invite failures do not roll back the family.
  const inviteResults: CreateFamilyInviteResult[] = [];
  for (const invite of input.stagedInvites) {
    inviteResults.push(
      await createStagedInvite({
        prisma,
        familyId: family.id,
        actorUserId,
        invite,
        origin,
      }),
    );
  }

  const failedInvites = inviteResults
    .filter((result) => !result.ok)
    .map((result) => ({
      inviteId: result.inviteId,
      message: result.message ?? "Invite could not be created",
    }));

  return {
    completion: {
      failedInvites,
      inviteResults,
      status: failedInvites.length > 0 ? "warning" : "success",
    },
    family: {
      id: family.id,
      name: family.name,
      description: family.description,
      pictureStorageKey: family.pictureStorageKey,
      createdAt: family.createdAt,
      updatedAt: family.updatedAt,
      role: FamilyRole.admin,
    },
  };
}
