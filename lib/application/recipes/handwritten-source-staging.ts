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

export function assertHandwrittenSourceImageUpload(input: {
  mimeType: string;
  sizeBytes: number;
}) {
  if (!isSupportedOcrMimeType(input.mimeType)) {
    throw new Error("Unsupported handwritten file type. Use JPG, PNG, WEBP, TIFF, or BMP.");
  }

  if (input.sizeBytes > getRecipeImportHandwrittenMaxImageBytes()) {
    throw new Error("Each handwritten image must be 10MB or smaller.");
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

  if (input.totalBytes > getRecipeImportHandwrittenMaxUploadBytes()) {
    throw new Error("Combined handwritten image uploads must be 20MB or smaller.");
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
