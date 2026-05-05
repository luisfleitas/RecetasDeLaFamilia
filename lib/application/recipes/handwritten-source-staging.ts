import {
  getRecipeImportHandwrittenMaxImageBytes,
  getRecipeImportHandwrittenMaxImageCount,
  getRecipeImportHandwrittenMaxUploadBytes,
} from "@/lib/application/recipes/import-config";
import { isSupportedOcrMimeType } from "@/lib/application/recipes/local-ocr";

export const HANDWRITTEN_UPLOAD_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/bmp",
];

function formatUploadSize(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1) {
    return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
  }

  return `${Math.ceil(bytes / 1024)} KB`;
}

export function assertHandwrittenSourceImageUpload(input: {
  mimeType: string;
  sizeBytes: number;
}) {
  if (!isSupportedOcrMimeType(input.mimeType)) {
    throw new Error("Unsupported handwritten file type. Use JPG, PNG, WEBP, TIFF, or BMP.");
  }

  const maxImageBytes = getRecipeImportHandwrittenMaxImageBytes();
  if (input.sizeBytes > maxImageBytes) {
    throw new Error(`Each handwritten image must be ${formatUploadSize(maxImageBytes)} or smaller.`);
  }
}

export function assertHandwrittenSourceImageBatch(input: {
  imageCount: number;
  totalBytes: number;
}) {
  const maxImageCount = getRecipeImportHandwrittenMaxImageCount();
  if (input.imageCount > maxImageCount) {
    throw new Error(`Upload up to ${maxImageCount} handwritten images per import.`);
  }

  const maxUploadBytes = getRecipeImportHandwrittenMaxUploadBytes();
  if (input.totalBytes > maxUploadBytes) {
    throw new Error(
      `Combined upload size exceeds ${formatUploadSize(maxUploadBytes)} limit for handwritten images.`,
    );
  }
}

export function sanitizeUploadPathSegment(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned.length > 0 ? cleaned : "handwritten-source";
}
