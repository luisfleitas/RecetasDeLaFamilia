export type RecipeListItem = {
  id: number;
  title: string;
  createdByUserId: number;
  createdAt: Date;
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
  createdByUserId: number;
  createdAt: Date;
  updatedAt: Date;
  ingredients: Ingredient[];
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
  ingredients: CreateIngredientInput[];
};
