import { requireAuthPage } from "@/lib/auth/require-auth-page";
import RecipeWorkspaceFrame from "@/app/_components/recipe-workspace-frame";
import ImportRecipeForm from "@/app/recipes/import/import-recipe-form";
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
import { notFound } from "next/navigation";

export default async function ImportRecipePage() {
  const authUser = await requireAuthPage();
  if (!isRecipeImportEnabled()) {
    notFound();
  }
  const { locale, messages } = await getRequestMessages();

  return (
    <RecipeWorkspaceFrame
      authUser={authUser}
      contentId="recipe-import-workspace-content"
      idPrefix="recipe-import"
      locale={locale}
      messages={messages}
    >
      <ImportRecipeForm
        handwrittenBlobUploadPathPrefix={getRecipeImportHandwrittenBlobUploadPathPrefix()}
        handwrittenEnabled={isRecipeImportHandwrittenEnabled()}
        handwrittenMaxImageBytes={getRecipeImportHandwrittenMaxImageBytes()}
        handwrittenMaxImageCount={getRecipeImportHandwrittenMaxImageCount()}
        handwrittenMaxUploadBytes={getRecipeImportHandwrittenMaxUploadBytes()}
        handwrittenSourceUploadMode={usesBlobImageStorage() ? "blob" : "server"}
      />
    </RecipeWorkspaceFrame>
  );
}
