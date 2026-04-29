import {
  DEFAULT_RECIPE_LANGUAGE,
  type RecipeLanguage,
} from "@/lib/domain/recipe-language";

const SPANISH_LANGUAGE_SIGNAL =
  /\b(ingredientes|pasos|preparaci[oó]n|mezclar|agrega|agregar|cocinar|cucharada|cucharadita|taza|arroz|queso)\b/i;

export function inferRecipeLanguageFromText(text: string): RecipeLanguage {
  return SPANISH_LANGUAGE_SIGNAL.test(text) ? "es" : DEFAULT_RECIPE_LANGUAGE;
}
