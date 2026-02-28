import { CreateIngredientInput, CreateRecipeInput, RecipeVisibility } from "@/lib/domain/recipe";

type IncomingIngredient = {
  name?: unknown;
  qty?: unknown;
  unit?: unknown;
  notes?: unknown;
  position?: unknown;
};

type IncomingRecipe = {
  title?: unknown;
  description?: unknown;
  stepsMarkdown?: unknown;
  visibility?: unknown;
  familyIds?: unknown;
  ingredients?: unknown;
};

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toOptionalString(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Expected string");
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toPositiveNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a positive number`);
  }
  return value;
}

function toPositivePosition(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value as number;
}

function parseIngredients(input: unknown): CreateIngredientInput[] {
  if (!Array.isArray(input)) {
    throw new Error("ingredients must be an array");
  }

  if (input.length === 0) {
    throw new Error("ingredients must be a non-empty array");
  }

  return input.map((item, index) => {
    const ingredient = item as IncomingIngredient;

    if (!isNonEmptyString(ingredient.name)) {
      throw new Error(`ingredients[${index}].name is required`);
    }

    if (!isNonEmptyString(ingredient.unit)) {
      throw new Error(`ingredients[${index}].unit is required`);
    }

    if (ingredient.qty == null) {
      throw new Error(`ingredients[${index}].qty is required`);
    }

    if (ingredient.position == null) {
      throw new Error(`ingredients[${index}].position is required`);
    }

    return {
      name: ingredient.name.trim(),
      qty: toPositiveNumber(ingredient.qty, `ingredients[${index}].qty`),
      unit: ingredient.unit.trim(),
      notes: toOptionalString(ingredient.notes),
      position: toPositivePosition(ingredient.position, `ingredients[${index}].position`),
    };
  });
}

function parseVisibility(value: unknown): RecipeVisibility {
  if (value == null) {
    return "public";
  }

  if (value === "public" || value === "private" || value === "family") {
    return value;
  }

  throw new Error("visibility must be one of: public, private, family");
}

function parseFamilyIds(input: unknown): number[] {
  if (input == null) {
    return [];
  }

  if (!Array.isArray(input)) {
    throw new Error("familyIds must be an array");
  }

  const unique = new Set<number>();

  for (const item of input) {
    if (!Number.isInteger(item) || (item as number) <= 0) {
      throw new Error("familyIds must contain positive integers");
    }

    unique.add(item as number);
  }

  return [...unique];
}

export function parseCreateRecipeInput(input: unknown): CreateRecipeInput {
  const recipe = input as IncomingRecipe;

  if (!isNonEmptyString(recipe.title)) {
    throw new Error("title is required");
  }

  if (!isNonEmptyString(recipe.stepsMarkdown)) {
    throw new Error("stepsMarkdown is required");
  }

  let description: string | null;
  try {
    description = toOptionalString(recipe.description);
  } catch {
    throw new Error("description must be a string");
  }

  const visibility = parseVisibility(recipe.visibility);
  const familyIds = parseFamilyIds(recipe.familyIds);

  if (visibility === "family" && familyIds.length === 0) {
    throw new Error("familyIds is required when visibility is family");
  }

  return {
    title: recipe.title.trim(),
    description,
    stepsMarkdown: recipe.stepsMarkdown.trim(),
    visibility,
    familyIds,
    ingredients: parseIngredients(recipe.ingredients),
  };
}

export function parseRecipeId(id: string): number | null {
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}
