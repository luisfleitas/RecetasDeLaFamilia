import { requireAuthPage } from "@/lib/auth/require-auth-page";
import AddRecipeWorkflow from "@/app/recipes/add/add-recipe-workflow";
import {
  getRecipeImportHandwrittenBlobUploadPathPrefix,
  getRecipeImportHandwrittenMaxImageBytes,
  getRecipeImportHandwrittenMaxImageCount,
  getRecipeImportHandwrittenMaxUploadBytes,
  isRecipeImportEnabled,
  isRecipeImportHandwrittenEnabled,
} from "@/lib/application/recipes/import-config";

export default async function AddRecipePage() {
  await requireAuthPage();

  const imageDriver = process.env.IMAGE_STORAGE_DRIVER ?? "local";
  const usesBlobUploads = imageDriver === "vercel-blob" || imageDriver === "blob";

  return (
    <AddRecipeWorkflow
      handwrittenBlobUploadPathPrefix={getRecipeImportHandwrittenBlobUploadPathPrefix()}
      handwrittenEnabled={isRecipeImportHandwrittenEnabled()}
      handwrittenMaxImageBytes={getRecipeImportHandwrittenMaxImageBytes()}
      handwrittenMaxImageCount={getRecipeImportHandwrittenMaxImageCount()}
      handwrittenMaxUploadBytes={getRecipeImportHandwrittenMaxUploadBytes()}
      handwrittenSourceUploadMode={usesBlobUploads ? "blob" : "server"}
      isRecipeImportEnabled={isRecipeImportEnabled()}
    />
  );
}
