import { listVisibleRecipeSourceImages } from "@/lib/application/recipes/display-source-images";
import type { RecipeUseCases } from "@/lib/application/recipes/use-cases";
import type { RecipeListItem } from "@/lib/domain/recipe";
import { buildRecipeUseCases } from "@/lib/recipes/factory";

export type PageRecipeListItem = Omit<RecipeListItem, "createdAt" | "families" | "images"> & {
  createdAt: string;
  families: NonNullable<RecipeListItem["families"]>;
  images: NonNullable<RecipeListItem["images"]>;
};

type LoadRecipeListForPageDeps = {
  viewerUserId: number | null;
  recipeUseCases?: Pick<RecipeUseCases, "listRecipes">;
  listVisibleRecipeSourceImages?: typeof listVisibleRecipeSourceImages;
};

export async function loadRecipeListForPage({
  viewerUserId,
  recipeUseCases = buildRecipeUseCases(),
  listVisibleRecipeSourceImages: loadVisibleSourceImages = listVisibleRecipeSourceImages,
}: LoadRecipeListForPageDeps) {
  const recipes = await recipeUseCases.listRecipes(viewerUserId, {
    includePrimaryImage: true,
    includeImages: true,
  });
  const visibleSourceImagesByRecipeId = await loadVisibleSourceImages(recipes, viewerUserId);

  const pageRecipes: PageRecipeListItem[] = recipes.map((recipe) => ({
    ...recipe,
    createdAt: recipe.createdAt.toISOString(),
    families: recipe.families ?? [],
    images: [...(recipe.images ?? []), ...(visibleSourceImagesByRecipeId.get(recipe.id) ?? [])],
  }));

  return {
    recipes: pageRecipes,
  };
}
