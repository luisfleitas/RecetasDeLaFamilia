import { requireAuthPage } from "@/lib/auth/require-auth-page";
import NewRecipeForm from "@/app/recipes/new/new-recipe-form";

export default async function NewRecipePage() {
  await requireAuthPage();

  return <NewRecipeForm />;
}
