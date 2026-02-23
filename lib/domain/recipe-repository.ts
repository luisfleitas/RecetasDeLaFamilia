import type {
  AddRecipeImageInput,
  CreateRecipeInput,
  Recipe,
  RecipeImage,
  RecipeListItem,
} from "@/lib/domain/recipe";

export type ListRecipeOptions = {
  includePrimaryImage?: boolean;
  includeImages?: boolean;
};

export type GetRecipeByIdOptions = {
  includePrimaryImage?: boolean;
  includeImages?: boolean;
};

export interface RecipeRepository {
  list(options?: ListRecipeOptions): Promise<RecipeListItem[]>;
  getById(id: number, options?: GetRecipeByIdOptions): Promise<Recipe | null>;
  getOwnerById(id: number): Promise<number | null>;
  create(input: CreateRecipeInput, createdByUserId: number): Promise<Recipe>;
  update(id: number, input: CreateRecipeInput): Promise<Recipe | null>;
  delete(id: number): Promise<boolean>;
  addImage(recipeId: number, input: AddRecipeImageInput): Promise<RecipeImage>;
  countImagesByRecipeId(recipeId: number): Promise<number>;
  setPrimaryImage(recipeId: number, imageId: number): Promise<boolean>;
  getPrimaryImageByRecipeId(recipeId: number): Promise<RecipeImage | null>;
  getImageById(imageId: number): Promise<RecipeImage | null>;
  deleteImageById(recipeId: number, imageId: number): Promise<{
    deleted: boolean;
    deletedImage: RecipeImage | null;
    promotedPrimaryImageId: number | null;
  }>;
}
