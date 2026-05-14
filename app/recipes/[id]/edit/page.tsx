import Link from "next/link";
import { notFound } from "next/navigation";
import RecipeWorkspaceFrame from "@/app/_components/recipe-workspace-frame";
import EditRecipeForm from "@/app/recipes/[id]/edit/edit-recipe-form";
import { requireAuthPage } from "@/lib/auth/require-auth-page";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import { listVisibleRecipeSourceDocuments } from "@/lib/application/recipes/visible-source-documents";
import { getRequestMessages } from "@/lib/i18n/server";
import { buildRecipeUseCases } from "@/lib/recipes/factory";

type Params = {
  params: Promise<{ id: string }>;
};

const recipeUseCases = buildRecipeUseCases();

function parseRecipeId(value: string): number | null {
  const recipeId = Number(value);
  return Number.isInteger(recipeId) && recipeId > 0 ? recipeId : null;
}

async function fetchRecipe(id: string, viewerUserId: number) {
  const recipeId = parseRecipeId(id);
  if (!recipeId) {
    notFound();
  }

  const recipe = await recipeUseCases.getRecipeById(recipeId, viewerUserId, {
    includeImages: true,
    includePrimaryImage: true,
  });

  if (!recipe) {
    notFound();
  }

  return recipe;
}

async function fetchRecipeSourceDocuments(id: string, viewerUserId: number) {
  const recipeId = parseRecipeId(id);
  if (!recipeId) {
    return [];
  }

  const sourceDocuments = await listVisibleRecipeSourceDocuments({ recipeId, viewerUserId });
  return sourceDocuments.map((sourceDocument) => ({
    id: sourceDocument.id,
    originalFilename: sourceDocument.originalFilename,
    thumbnailUrl: sourceDocument.fileUrl,
    fullUrl: sourceDocument.fileUrl,
    publiclyVisible: sourceDocument.publiclyVisible === true,
    isPrimary: sourceDocument.isPrimary === true,
  }));
}

export default async function EditRecipePage({ params }: Params) {
  const authUser = await requireAuthPage();

  const { id } = await params;
  const [{ locale, messages }, recipe, sourceDocuments] = await Promise.all([
    getRequestMessages(),
    fetchRecipe(id, authUser.userId),
    fetchRecipeSourceDocuments(id, authUser.userId),
  ]);

  return (
    <RecipeWorkspaceFrame
      authUser={authUser}
      contentId="edit-recipe-workspace-content"
      idPrefix="edit-recipe"
      locale={locale}
      messages={messages}
    >
      <section id="edit-recipe-main" className="max-w-5xl space-y-6">
        <div id="edit-recipe-panel" className="surface-panel space-y-6 p-6 sm:p-8">
          <div id="edit-recipe-header" className="flex items-center justify-between gap-3">
            <h1 id="edit-recipe-title" className="text-2xl font-semibold">{messages.recipe.editTitle}</h1>
            <div id="edit-recipe-header-actions" className="flex flex-wrap items-center justify-end gap-2">
              <Link id="edit-recipe-back-link" href={`/recipes/${recipe.id}`} className={buttonClassName("secondary")}>
                {messages.common.backToRecipes}
              </Link>
            </div>
          </div>

          <EditRecipeForm recipe={{ ...recipe, sourceDocuments }} />
        </div>
      </section>
    </RecipeWorkspaceFrame>
  );
}
