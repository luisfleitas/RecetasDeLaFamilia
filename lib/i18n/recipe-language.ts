import type { RecipeLanguage } from "@/lib/domain/recipe-language";
import type { Messages } from "@/lib/i18n/messages";

export function getRecipeLanguageLabel(language: RecipeLanguage, messages: Messages) {
  return language === "es" ? messages.recipe.languageSpanish : messages.recipe.languageEnglish;
}
