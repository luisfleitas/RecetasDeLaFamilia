import { CreateRecipeInput, Recipe, RecipeListItem } from "@/lib/domain/recipe";
import { RecipeRepository } from "@/lib/domain/recipe-repository";

export type RecipeUseCases = {
  listRecipes: () => Promise<RecipeListItem[]>;
  getRecipeById: (id: number) => Promise<Recipe | null>;
  createRecipe: (userId: number, input: CreateRecipeInput) => Promise<Recipe>;
  updateRecipe: (
    userId: number,
    id: number,
    input: CreateRecipeInput,
  ) => Promise<{ recipe: Recipe | null; forbidden: boolean }>;
  deleteRecipe: (userId: number, id: number) => Promise<{ deleted: boolean; forbidden: boolean }>;
};

export function makeRecipeUseCases(recipeRepository: RecipeRepository): RecipeUseCases {
  return {
    async listRecipes() {
      return recipeRepository.list();
    },

    async getRecipeById(id: number) {
      return recipeRepository.getById(id);
    },

    async createRecipe(userId: number, input: CreateRecipeInput) {
      return recipeRepository.create(input, userId);
    },

    async updateRecipe(userId: number, id: number, input: CreateRecipeInput) {
      const ownerId = await recipeRepository.getOwnerById(id);

      if (!ownerId) {
        return { recipe: null, forbidden: false };
      }

      if (ownerId !== userId) {
        return { recipe: null, forbidden: true };
      }

      const recipe = await recipeRepository.update(id, input);
      return { recipe, forbidden: false };
    },

    async deleteRecipe(userId: number, id: number) {
      const ownerId = await recipeRepository.getOwnerById(id);

      if (!ownerId) {
        return { deleted: false, forbidden: false };
      }

      if (ownerId !== userId) {
        return { deleted: false, forbidden: true };
      }

      const deleted = await recipeRepository.delete(id);
      return { deleted, forbidden: false };
    },
  };
}
