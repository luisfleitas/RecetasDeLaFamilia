export const SUPPORTED_RECIPE_LANGUAGES = ["en", "es"] as const;

export type RecipeLanguage = (typeof SUPPORTED_RECIPE_LANGUAGES)[number];

export const DEFAULT_RECIPE_LANGUAGE: RecipeLanguage = "en";

export function isRecipeLanguage(value: unknown): value is RecipeLanguage {
  return typeof value === "string" && SUPPORTED_RECIPE_LANGUAGES.includes(value as RecipeLanguage);
}

export function normalizeRecipeLanguage(
  value: unknown,
  fallback: RecipeLanguage = DEFAULT_RECIPE_LANGUAGE,
): RecipeLanguage {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return isRecipeLanguage(normalized) ? normalized : fallback;
}
