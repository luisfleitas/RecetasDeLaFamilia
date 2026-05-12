import {
  formatRecipeImageMaxUploadSize,
  RECIPE_IMAGE_MAX_UPLOAD_BYTES,
} from "@/lib/application/recipes/image-upload-constraints";

export const FAMILY_IMAGE_MAX_UPLOAD_BYTES = RECIPE_IMAGE_MAX_UPLOAD_BYTES;
export const FAMILY_IMAGE_SIZE_PX = 512;
export const FAMILY_IMAGE_PREFIX = "family-images";

const ALLOWED_FAMILY_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function formatFamilyImageMaxUploadSize() {
  return formatRecipeImageMaxUploadSize();
}

export function assertSupportedFamilyImageMimeType(mimeType: string) {
  if (!ALLOWED_FAMILY_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error("Unsupported image type. Allowed: JPEG, PNG, WEBP.");
  }
}

export function assertSupportedFamilyImageSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("Image size must be a positive number.");
  }

  if (sizeBytes > FAMILY_IMAGE_MAX_UPLOAD_BYTES) {
    throw new Error(`Image exceeds the ${formatFamilyImageMaxUploadSize()} limit.`);
  }
}

export function isValidFamilyImageStorageKey(storageKey: string) {
  return storageKey.startsWith(`${FAMILY_IMAGE_PREFIX}/`) && !storageKey.includes("..");
}

export const familyImageConstraints = {
  maxImageBytes: FAMILY_IMAGE_MAX_UPLOAD_BYTES,
  width: FAMILY_IMAGE_SIZE_PX,
  height: FAMILY_IMAGE_SIZE_PX,
  allowedMimeTypes: [...ALLOWED_FAMILY_IMAGE_MIME_TYPES],
};
