import { CreateRecipeInput, Recipe, RecipeListItem } from "@/lib/domain/recipe";

export interface RecipeRepository {
  list(): Promise<RecipeListItem[]>;
  getById(id: number): Promise<Recipe | null>;
  create(input: CreateRecipeInput): Promise<Recipe>;
  update(id: number, input: CreateRecipeInput): Promise<Recipe | null>;
}
