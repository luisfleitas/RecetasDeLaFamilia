import { requireAuthPage } from "@/lib/auth/require-auth-page";
import RecipeWorkspaceFrame from "@/app/_components/recipe-workspace-frame";
import NewRecipeForm from "@/app/recipes/new/new-recipe-form";
import { isRecipeImportEnabled } from "@/lib/application/recipes/import-config";
import { getRequestMessages } from "@/lib/i18n/server";

export default async function NewRecipePage() {
  const authUser = await requireAuthPage();
  const { locale, messages } = await getRequestMessages();

  return (
    <RecipeWorkspaceFrame
      authUser={authUser}
      contentId="new-recipe-workspace-content"
      idPrefix="new-recipe"
      locale={locale}
      messages={messages}
    >
      <NewRecipeForm isRecipeImportEnabled={isRecipeImportEnabled()} />
    </RecipeWorkspaceFrame>
  );
}
