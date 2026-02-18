import { CreateRecipeInput, Recipe, RecipeListItem } from "@/lib/domain/recipe";
import { RecipeRepository } from "@/lib/domain/recipe-repository";

export type RecipeUseCases = {
  listRecipes: () => Promise<RecipeListItem[]>;
  getRecipeById: (id: number) => Promise<Recipe | null>;
  createRecipe: (input: CreateRecipeInput) => Promise<Recipe>;
  updateRecipe: (id: number, input: CreateRecipeInput) => Promise<Recipe | null>;
};

export function makeRecipeUseCases(recipeRepository: RecipeRepository): RecipeUseCases {
  return {
    async listRecipes() {
      return recipeRepository.list();
    },

    async getRecipeById(id: number) {
      return recipeRepository.getById(id);
    },

    async createRecipe(input: CreateRecipeInput) {
      return recipeRepository.create(input);
    },

    async updateRecipe(id: number, input: CreateRecipeInput) {
      return recipeRepository.update(id, input);
    },
  };
}
