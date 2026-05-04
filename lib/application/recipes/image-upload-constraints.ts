export const RECIPE_IMAGE_MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const RECIPE_IMAGE_MAX_UPLOAD_MB = RECIPE_IMAGE_MAX_UPLOAD_BYTES / (1024 * 1024);

export function formatRecipeImageMaxUploadSize() {
  return `${RECIPE_IMAGE_MAX_UPLOAD_MB}MB`;
}
