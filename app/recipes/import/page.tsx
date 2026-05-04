import { requireAuthPage } from "@/lib/auth/require-auth-page";
import ImportRecipeForm from "@/app/recipes/import/import-recipe-form";
import {
  getRecipeImportHandwrittenBlobUploadPathPrefix,
  getRecipeImportHandwrittenMaxImageBytes,
  getRecipeImportHandwrittenMaxImageCount,
  getRecipeImportHandwrittenMaxUploadBytes,
  isRecipeImportEnabled,
  isRecipeImportHandwrittenEnabled,
} from "@/lib/application/recipes/import-config";
import { notFound } from "next/navigation";

export default async function ImportRecipePage() {
  await requireAuthPage();
  if (!isRecipeImportEnabled()) {
    notFound();
  }

  const imageDriver = process.env.IMAGE_STORAGE_DRIVER ?? "local";
  const usesBlobUploads = imageDriver === "vercel-blob" || imageDriver === "blob";

  return (
    <ImportRecipeForm
      handwrittenBlobUploadPathPrefix={getRecipeImportHandwrittenBlobUploadPathPrefix()}
      handwrittenEnabled={isRecipeImportHandwrittenEnabled()}
      handwrittenMaxImageBytes={getRecipeImportHandwrittenMaxImageBytes()}
      handwrittenMaxImageCount={getRecipeImportHandwrittenMaxImageCount()}
      handwrittenMaxUploadBytes={getRecipeImportHandwrittenMaxUploadBytes()}
      handwrittenSourceUploadMode={usesBlobUploads ? "blob" : "server"}
    />
  );
}
