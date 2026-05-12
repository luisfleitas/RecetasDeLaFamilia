import { randomUUID } from "node:crypto";
import sharp from "sharp";
import {
  assertSupportedFamilyImageMimeType,
  assertSupportedFamilyImageSize,
  FAMILY_IMAGE_PREFIX,
  FAMILY_IMAGE_SIZE_PX,
} from "@/lib/application/families/family-image-constraints";
import { buildFamilyPictureUrl, isFamilyAdmin } from "@/lib/families/utils";
import type { ImageStorageProvider } from "@/lib/infrastructure/images/image-storage-provider";
import { buildImageStorageProvider } from "@/lib/infrastructure/images/storage-factory";
import { getPrisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

export type UploadedFamilyImage = {
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};

export type FamilyImageResult = {
  storageKey: string;
  pictureUrl: string | null;
  width: number;
  height: number;
  mimeType: "image/jpeg";
};

export type FamilyImageUseCaseDeps = {
  prisma?: PrismaClient;
  storageProvider?: ImageStorageProvider;
};

type FamilyProfileImage = {
  pictureStorageKey: string | null;
  pictureUrl: string | null;
};

async function resizeFamilyImage(buffer: Buffer) {
  return sharp(buffer)
    .rotate()
    .resize(FAMILY_IMAGE_SIZE_PX, FAMILY_IMAGE_SIZE_PX, { fit: "cover", position: "centre" })
    .jpeg({ quality: 84 })
    .toBuffer();
}

function buildStagedFamilyImageKey(userId: number) {
  return `${FAMILY_IMAGE_PREFIX}/staged/user-${userId}/family_${randomUUID()}.jpg`;
}

function buildFamilyImageKey(familyId: number) {
  return `${FAMILY_IMAGE_PREFIX}/${familyId}/family_${randomUUID()}.jpg`;
}

async function persistFamilyImage(storageProvider: ImageStorageProvider, key: string, image: UploadedFamilyImage) {
  assertSupportedFamilyImageMimeType(image.mimeType);
  assertSupportedFamilyImageSize(image.sizeBytes);

  const buffer = await resizeFamilyImage(image.buffer);
  await storageProvider.putObject({
    key,
    buffer,
    contentType: "image/jpeg",
  });

  return {
    storageKey: key,
    pictureUrl: buildFamilyPictureUrl(key),
    width: FAMILY_IMAGE_SIZE_PX,
    height: FAMILY_IMAGE_SIZE_PX,
    mimeType: "image/jpeg" as const,
  };
}

async function cleanupOldImage(storageProvider: ImageStorageProvider, storageKey: string | null) {
  if (!storageKey) {
    return;
  }

  try {
    await storageProvider.deleteObject(storageKey);
  } catch {
    // Profile updates should survive best-effort cleanup failures.
  }
}

export function buildFamilyImageUseCases(deps?: FamilyImageUseCaseDeps) {
  const prismaPromise = deps?.prisma ? Promise.resolve(deps.prisma) : getPrisma();
  const storageProvider = deps?.storageProvider ?? buildImageStorageProvider();

  async function prisma() {
    return prismaPromise;
  }

  return {
    async stageFamilyImageForCreate(input: {
      userId: number;
      image: UploadedFamilyImage;
    }): Promise<FamilyImageResult> {
      return persistFamilyImage(storageProvider, buildStagedFamilyImageKey(input.userId), input.image);
    },

    async replaceFamilyImage(input: {
      familyId: number;
      userId: number;
      image: UploadedFamilyImage;
    }): Promise<{ forbidden: boolean; family: FamilyProfileImage | null }> {
      const db = await prisma();
      const admin = await isFamilyAdmin(db, input.familyId, input.userId);
      if (!admin) {
        return { forbidden: true, family: null };
      }

      const existingFamily = await db.family.findUnique({
        where: { id: input.familyId },
        select: { pictureStorageKey: true },
      });
      if (!existingFamily) {
        return { forbidden: false, family: null };
      }

      const image = await persistFamilyImage(storageProvider, buildFamilyImageKey(input.familyId), input.image);
      const family = await db.family.update({
        where: { id: input.familyId },
        data: { pictureStorageKey: image.storageKey },
        select: { pictureStorageKey: true },
      });

      await cleanupOldImage(storageProvider, existingFamily.pictureStorageKey);

      return {
        forbidden: false,
        family: {
          pictureStorageKey: family.pictureStorageKey,
          pictureUrl: buildFamilyPictureUrl(family.pictureStorageKey),
        },
      };
    },

    async removeFamilyImage(input: {
      familyId: number;
      userId: number;
    }): Promise<{ forbidden: boolean; family: FamilyProfileImage | null }> {
      const db = await prisma();
      const admin = await isFamilyAdmin(db, input.familyId, input.userId);
      if (!admin) {
        return { forbidden: true, family: null };
      }

      const existingFamily = await db.family.findUnique({
        where: { id: input.familyId },
        select: { pictureStorageKey: true },
      });
      if (!existingFamily) {
        return { forbidden: false, family: null };
      }

      const family = await db.family.update({
        where: { id: input.familyId },
        data: { pictureStorageKey: null },
        select: { pictureStorageKey: true },
      });

      await cleanupOldImage(storageProvider, existingFamily.pictureStorageKey);

      return {
        forbidden: false,
        family: {
          pictureStorageKey: family.pictureStorageKey,
          pictureUrl: buildFamilyPictureUrl(family.pictureStorageKey),
        },
      };
    },
  };
}
