import { RecipeImportError } from "@/lib/application/recipes/import-errors";
import type { ImportedRecipeDraft } from "@/lib/application/recipes/text-document-import";
import { normalizeRecipeLanguage } from "@/lib/domain/recipe-language";

const IMPORTED_INGREDIENT_DEFAULT_UNIT = "unit";

export function validateImportedRecipeDraft(draft: ImportedRecipeDraft): ImportedRecipeDraft {
  const title = draft.title.trim();
  const description = draft.description?.trim() || null;
  const stepsMarkdown = draft.stepsMarkdown.trim();

  if (!stepsMarkdown || draft.ingredients.length === 0) {
    throw new RecipeImportError(
      "MISSING_REQUIRED_FIELDS",
      "Imported draft is missing required ingredients or steps.",
      400,
    );
  }

  const ingredients = draft.ingredients.map((ingredient, index) => {
    const name = ingredient.name.trim();
    // Some extractors correctly avoid inventing a unit for count-based or to-taste ingredients.
    const unit = ingredient.unit.trim() || IMPORTED_INGREDIENT_DEFAULT_UNIT;

    if (!name || !unit || !Number.isFinite(ingredient.qty) || ingredient.qty <= 0) {
      throw new RecipeImportError(
        "MISSING_REQUIRED_FIELDS",
        `Imported draft has invalid ingredient fields at row ${index + 1}.`,
        400,
      );
    }

    return {
      ...ingredient,
      name,
      unit,
      notes: ingredient.notes?.trim() || null,
      position: index + 1,
    };
  });

  return {
    title,
    description,
    stepsMarkdown,
    language: normalizeRecipeLanguage(draft.language),
    ingredients,
  };
}
