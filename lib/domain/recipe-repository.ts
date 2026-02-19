import { CreateRecipeInput, Recipe, RecipeListItem } from "@/lib/domain/recipe";

export interface RecipeRepository {
  list(): Promise<RecipeListItem[]>;
  getById(id: number): Promise<Recipe | null>;
  getOwnerById(id: number): Promise<number | null>;
  create(input: CreateRecipeInput, createdByUserId: number): Promise<Recipe>;
  update(id: number, input: CreateRecipeInput): Promise<Recipe | null>;
  delete(id: number): Promise<boolean>;
}
