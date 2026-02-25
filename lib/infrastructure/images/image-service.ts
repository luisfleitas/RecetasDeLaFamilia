import sharp from "sharp";
import type { ImageStorageProvider } from "./image-storage-provider";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const FULL_IMAGE_WIDTH = 1200;
const FULL_IMAGE_HEIGHT = 800;
const THUMB_IMAGE_WIDTH = 400;
const THUMB_IMAGE_HEIGHT = 267;

export type ResizeImageResult = {
  fullBuffer: Buffer;
  thumbnailBuffer: Buffer;
  width: number;
  height: number;
  mimeType: "image/jpeg";
};

export type BuildImageKeysResult = {
  fullKey: string;
  thumbnailKey: string;
};

export function assertSupportedImageMimeType(mimeType: string) {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Unsupported image type. Allowed: JPEG, PNG, WEBP.");
  }
}

export function assertSupportedImageSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("Image size must be a positive number.");
  }

  if (sizeBytes > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds the 10MB limit.");
  }
}

export function buildRecipeImageKeys(recipeId: number, imageId: number): BuildImageKeysResult {
  return {
    fullKey: `recipes/${recipeId}/img_${imageId}.jpg`,
    thumbnailKey: `recipes/${recipeId}/thumb_${imageId}.jpg`,
  };
}

export async function resizeRecipeImage(buffer: Buffer): Promise<ResizeImageResult> {
  const fullBuffer = await sharp(buffer)
    .rotate()
    .resize(FULL_IMAGE_WIDTH, FULL_IMAGE_HEIGHT, { fit: "cover", position: "centre" })
    .jpeg({ quality: 85 })
    .toBuffer();

  const thumbnailBuffer = await sharp(buffer)
    .rotate()
    .resize(THUMB_IMAGE_WIDTH, THUMB_IMAGE_HEIGHT, { fit: "cover", position: "centre" })
    .jpeg({ quality: 82 })
    .toBuffer();

  return {
    fullBuffer,
    thumbnailBuffer,
    width: FULL_IMAGE_WIDTH,
    height: FULL_IMAGE_HEIGHT,
    mimeType: "image/jpeg",
  };
}

export async function cleanupImageKeys(
  storageProvider: ImageStorageProvider,
  keys: string[],
): Promise<void> {
  await Promise.all(keys.map((key) => storageProvider.deleteObject(key)));
}

export const imageConstraints = {
  maxImageBytes: MAX_IMAGE_BYTES,
  full: {
    width: FULL_IMAGE_WIDTH,
    height: FULL_IMAGE_HEIGHT,
  },
  thumb: {
    width: THUMB_IMAGE_WIDTH,
    height: THUMB_IMAGE_HEIGHT,
  },
  allowedMimeTypes: [...ALLOWED_MIME_TYPES],
};
