import { parseRecipeSourceDocumentMetadata } from "@/lib/application/recipes/source-documents";
import { getPrisma } from "@/lib/prisma";

export type RecipeWithViewerAccess = {
  id: number;
  visibility: "public" | "private" | "family";
  createdByUserId: number;
};

export type VisibleRecipeSourceImageRef = {
  id: number;
  fullUrl: string;
  thumbnailUrl: string;
  isPrimary: false;
};

function canViewerAccessPrivateSourceImages(
  recipe: RecipeWithViewerAccess,
  viewerUserId: number | null,
): boolean {
  if (!viewerUserId) {
    return false;
  }

  if (recipe.createdByUserId === viewerUserId) {
    return true;
  }

  return recipe.visibility === "family";
}

export async function listVisibleRecipeSourceImages(
  recipes: RecipeWithViewerAccess[],
  viewerUserId: number | null,
): Promise<Map<number, VisibleRecipeSourceImageRef[]>> {
  const recipeIds = recipes.map((recipe) => recipe.id);
  const byRecipeId = new Map<number, VisibleRecipeSourceImageRef[]>();

  if (recipeIds.length === 0) {
    return byRecipeId;
  }

  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const prisma = await getPrisma();
  const prismaDb = prisma as unknown as {
    recipeSourceDocument: {
      findMany: (args: {
        where: { recipeId: { in: number[] }; sourceType: "image" };
        orderBy: Array<{ recipeId: "asc" } | { createdAt: "asc" }>;
        select: {
          id: true;
          recipeId: true;
          metadataJson: true;
        };
      }) => Promise<
        Array<{
          id: number;
          recipeId: number;
          metadataJson: string | null;
        }>
      >;
    };
  };

  const sourceDocuments = await prismaDb.recipeSourceDocument.findMany({
    where: {
      recipeId: { in: recipeIds },
      sourceType: "image",
    },
    orderBy: [{ recipeId: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      recipeId: true,
      metadataJson: true,
    },
  });

  for (const sourceDocument of sourceDocuments) {
    const recipe = recipeById.get(sourceDocument.recipeId);
    if (!recipe) {
      continue;
    }

    const metadata = parseRecipeSourceDocumentMetadata(sourceDocument.metadataJson);
    if (metadata?.inputMode !== "handwritten") {
      continue;
    }

    const isVisible =
      canViewerAccessPrivateSourceImages(recipe, viewerUserId) || metadata.publiclyVisible === true;
    if (!isVisible) {
      continue;
    }

    const visibleImages = byRecipeId.get(sourceDocument.recipeId) ?? [];
    visibleImages.push({
      id: sourceDocument.id * -1,
      fullUrl: `/api/recipes/${sourceDocument.recipeId}/source-documents/${sourceDocument.id}/file`,
      thumbnailUrl: `/api/recipes/${sourceDocument.recipeId}/source-documents/${sourceDocument.id}/file`,
      isPrimary: false,
    });
    byRecipeId.set(sourceDocument.recipeId, visibleImages);
  }

  return byRecipeId;
}
