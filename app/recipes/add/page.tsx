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
import { usesBlobImageStorage } from "@/lib/infrastructure/images/storage-factory";

export default async function AddRecipePage() {
  const authUser = await requireAuthPage();
  const { locale, messages } = await getRequestMessages();

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
        handwrittenSourceUploadMode={usesBlobImageStorage() ? "blob" : "server"}
        isRecipeImportEnabled={isRecipeImportEnabled()}
      />
    </RecipeWorkspaceFrame>
  );
}
