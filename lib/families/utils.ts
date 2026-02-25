import { createHash, randomBytes } from "node:crypto";
import { FamilyRole, type PrismaClient } from "@prisma/client";

const INVITE_TOKEN_BYTES = 32;
const INVITE_TTL_DAYS = 7;

export function buildFamilyPictureUrl(pictureStorageKey: string | null): string | null {
  if (!pictureStorageKey) {
    return null;
  }

  return `/uploads/${pictureStorageKey}`;
}

export function createFamilyInviteToken() {
  return randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
}

export function hashFamilyInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getInviteExpiryDate(now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + INVITE_TTL_DAYS);
  return expiresAt;
}

export function isInviteExpired(expiresAt: Date, now = new Date()) {
  return now >= expiresAt;
}

export function getInviteState(invite: {
  revokedAt: Date | null;
  consumedAt: Date | null;
  expiresAt: Date;
}): "active" | "revoked" | "consumed" | "expired" {
  if (invite.revokedAt) {
    return "revoked";
  }

  if (invite.consumedAt) {
    return "consumed";
  }

  if (isInviteExpired(invite.expiresAt)) {
    return "expired";
  }

  return "active";
}

export async function getFamilyMembership(prisma: PrismaClient, familyId: number, userId: number) {
  return prisma.familyMembership.findUnique({
    where: {
      familyId_userId: {
        familyId,
        userId,
      },
    },
  });
}

export async function isFamilyAdmin(prisma: PrismaClient, familyId: number, userId: number) {
  const membership = await getFamilyMembership(prisma, familyId, userId);
  return membership?.role === FamilyRole.admin;
}

export async function countFamilyAdmins(prisma: PrismaClient, familyId: number) {
  return prisma.familyMembership.count({
    where: {
      familyId,
      role: FamilyRole.admin,
    },
  });
}

export async function countFamilyMembers(prisma: PrismaClient, familyId: number) {
  return prisma.familyMembership.count({
    where: {
      familyId,
    },
  });
}
