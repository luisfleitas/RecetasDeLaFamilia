import { requireAuthPage } from "@/lib/auth/require-auth-page";
import RecipeWorkspaceFrame from "@/app/_components/recipe-workspace-frame";
import AddRecipeWorkflow from "@/app/recipes/add/add-recipe-workflow";
import {
  getRecipeImportHandwrittenBlobUploadPathPrefix,
  getRecipeImportHandwrittenMaxImageBytes,
  getRecipeImportHandwrittenMaxImageCount,
  getRecipeImportHandwrittenMaxUploadBytes,
  isRecipeImportEnabled,
  isRecipeImportHandwrittenEnabled,
} from "@/lib/application/recipes/import-config";
import { getRequestMessages } from "@/lib/i18n/server";

export default async function AddRecipePage() {
  const authUser = await requireAuthPage();
  const { locale, messages } = await getRequestMessages();

  const imageDriver = process.env.IMAGE_STORAGE_DRIVER ?? "local";
  const usesBlobUploads = imageDriver === "vercel-blob" || imageDriver === "blob";

  return (
    <RecipeWorkspaceFrame
      authUser={authUser}
      contentId="add-recipe-workspace-content"
      idPrefix="add-recipe"
      locale={locale}
      messages={messages}
    >
      <AddRecipeWorkflow
        handwrittenBlobUploadPathPrefix={getRecipeImportHandwrittenBlobUploadPathPrefix()}
        handwrittenEnabled={isRecipeImportHandwrittenEnabled()}
        handwrittenMaxImageBytes={getRecipeImportHandwrittenMaxImageBytes()}
        handwrittenMaxImageCount={getRecipeImportHandwrittenMaxImageCount()}
        handwrittenMaxUploadBytes={getRecipeImportHandwrittenMaxUploadBytes()}
        handwrittenSourceUploadMode={usesBlobUploads ? "blob" : "server"}
        isRecipeImportEnabled={isRecipeImportEnabled()}
      />
    </RecipeWorkspaceFrame>
  );
}
