import { requireAuthPage } from "@/lib/auth/require-auth-page";
import ImportRecipeForm from "@/app/recipes/import/import-recipe-form";

export default async function ImportRecipePage() {
  await requireAuthPage();

  return <ImportRecipeForm />;
}
