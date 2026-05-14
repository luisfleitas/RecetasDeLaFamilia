import { requireCompletedAuthPage } from "@/lib/auth/require-auth-page";
import NewRecipeForm from "@/app/recipes/new/new-recipe-form";
import { isRecipeImportEnabled } from "@/lib/application/recipes/import-config";

export default async function NewRecipePage() {
  await requireCompletedAuthPage("/recipes/new");

  return <NewRecipeForm isRecipeImportEnabled={isRecipeImportEnabled()} />;
}
