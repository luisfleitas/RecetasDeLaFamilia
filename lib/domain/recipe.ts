export type RecipeVisibility = "public" | "private" | "family";

export type RecipeFamilyRef = {
  id: number;
  name: string;
};

export type RecipeListItem = {
  id: number;
  title: string;
  createdByUserId: number;
  createdAt: Date;
  visibility: RecipeVisibility;
  families?: RecipeFamilyRef[];
  primaryImage?: PrimaryImageRef | null;
  images?: PrimaryImageRef[];
};

export type PrimaryImageRef = {
  id: number;
  thumbnailUrl: string;
  fullUrl: string;
};

export type RecipeImage = {
  id: number;
  recipeId: number;
  storageKey: string;
  thumbnailKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  position: number;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Ingredient = {
  id: number;
  name: string;
  qty: number;
  unit: string;
  notes: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Recipe = {
  id: number;
  title: string;
  description: string | null;
  stepsMarkdown: string;
  visibility: RecipeVisibility;
  families: RecipeFamilyRef[];
  createdByUserId: number;
  createdAt: Date;
  updatedAt: Date;
  ingredients: Ingredient[];
  images?: RecipeImage[];
  primaryImage?: PrimaryImageRef | null;
};

export type CreateIngredientInput = {
  name: string;
  qty: number;
  unit: string;
  notes: string | null;
  position: number;
};

export type CreateRecipeInput = {
  title: string;
  description: string | null;
  stepsMarkdown: string;
  visibility: RecipeVisibility;
  familyIds: number[];
  ingredients: CreateIngredientInput[];
};

export type AddRecipeImageInput = {
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  thumbnailKey: string;
  width: number;
  height: number;
  position: number;
  isPrimary: boolean;
};
