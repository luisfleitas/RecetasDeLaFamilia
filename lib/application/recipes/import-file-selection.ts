const HANDWRITTEN_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/bmp",
]);

export type RecipeImportFileSelection =
  | { kind: "empty" }
  | { kind: "document"; file: File }
  | { kind: "handwritten-images"; files: File[] }
  | { kind: "error"; message: string };

export function isAcceptedHandwrittenImageFile(file: File): boolean {
  return HANDWRITTEN_IMAGE_MIME_TYPES.has(file.type || "application/octet-stream");
}

export function resolveRecipeImportFileSelection(input: {
  files: File[];
  handwrittenEnabled: boolean;
}): RecipeImportFileSelection {
  const files = input.files.filter((file) => file.size > 0);

  if (files.length === 0) {
    return { kind: "empty" };
  }

  if (files.length === 1) {
    return { kind: "document", file: files[0] };
  }

  if (!files.every(isAcceptedHandwrittenImageFile)) {
    return { kind: "error", message: "Select one document file or multiple image files." };
  }

  if (!input.handwrittenEnabled) {
    return { kind: "error", message: "Multiple image parsing is not enabled right now." };
  }

  return { kind: "handwritten-images", files };
}
