import { FamilyRole } from "@prisma/client";

export const FAMILY_NAME_MAX_LENGTH = 80;
export const FAMILY_DESCRIPTION_MAX_LENGTH = 280;
export const FAMILY_PICTURE_KEY_MAX_LENGTH = 512;

export type CreateFamilyInput = {
  name: string;
  description: string | null;
  pictureStorageKey: string | null;
};

export type UpdateFamilyInput = {
  name?: string;
  description?: string | null;
  pictureStorageKey?: string | null;
};

export type CreateFamilyInviteInput = {
  usageType: "single_use" | "multi_use";
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateName(raw: unknown): string {
  const name = normalizeString(raw);

  if (name.length === 0) {
    throw new Error("Family name is required");
  }

  if (name.length > FAMILY_NAME_MAX_LENGTH) {
    throw new Error(`Family name must be ${FAMILY_NAME_MAX_LENGTH} characters or fewer`);
  }

  return name;
}

function validateDescription(raw: unknown): string | null {
  const description = normalizeOptionalString(raw);

  if (description && description.length > FAMILY_DESCRIPTION_MAX_LENGTH) {
    throw new Error(`Family description must be ${FAMILY_DESCRIPTION_MAX_LENGTH} characters or fewer`);
  }

  return description;
}

function validatePictureStorageKey(raw: unknown): string | null {
  if (raw === null) {
    return null;
  }

  const pictureStorageKey = normalizeOptionalString(raw);

  if (pictureStorageKey && pictureStorageKey.length > FAMILY_PICTURE_KEY_MAX_LENGTH) {
    throw new Error(`Family picture key must be ${FAMILY_PICTURE_KEY_MAX_LENGTH} characters or fewer`);
  }

  return pictureStorageKey;
}

export function parseCreateFamilyInput(body: unknown): CreateFamilyInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid family payload");
  }

  const input = body as Record<string, unknown>;

  return {
    name: validateName(input.name),
    description: validateDescription(input.description),
    pictureStorageKey: validatePictureStorageKey(input.pictureStorageKey),
  };
}

export function parseUpdateFamilyInput(body: unknown): UpdateFamilyInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid family payload");
  }

  const input = body as Record<string, unknown>;
  const updates: UpdateFamilyInput = {};

  if (Object.prototype.hasOwnProperty.call(input, "name")) {
    updates.name = validateName(input.name);
  }

  if (Object.prototype.hasOwnProperty.call(input, "description")) {
    updates.description = validateDescription(input.description);
  }

  if (Object.prototype.hasOwnProperty.call(input, "pictureStorageKey")) {
    updates.pictureStorageKey = validatePictureStorageKey(input.pictureStorageKey);
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("At least one field is required");
  }

  return updates;
}

export function parseFamilyRole(raw: unknown): FamilyRole {
  if (raw === "admin") {
    return FamilyRole.admin;
  }

  if (raw === "member") {
    return FamilyRole.member;
  }

  throw new Error("Role must be admin or member");
}

export function parsePositiveInt(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function parseCreateFamilyInviteInput(body: unknown): CreateFamilyInviteInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid invite payload");
  }

  const input = body as Record<string, unknown>;
  const usageType = input.usageType;
  if (usageType !== "single_use" && usageType !== "multi_use") {
    throw new Error("Invite usage type must be single_use or multi_use");
  }

  return { usageType };
}
