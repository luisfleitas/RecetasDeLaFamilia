import { requireAuthPage } from "@/lib/auth/require-auth-page";
import ImportRecipeForm from "@/app/recipes/import/import-recipe-form";
import { isRecipeImportEnabled } from "@/lib/application/recipes/import-config";
import { notFound } from "next/navigation";

export default async function ImportRecipePage() {
  await requireAuthPage();
  if (!isRecipeImportEnabled()) {
    notFound();
  }

  return <ImportRecipeForm />;
}
