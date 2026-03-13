import type { ImportedRecipeDraft } from "@/lib/application/recipes/text-document-import";

export type ImportWarning = {
  code:
    | "DESCRIPTION_MISSING"
    | "STEPS_MAY_BE_INCOMPLETE"
    | "INGREDIENT_UNIT_NEEDS_REVIEW";
  field: string | null;
  message: string;
};

function countSteps(stepsMarkdown: string): number {
  return stepsMarkdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line)).length;
}

export function getImportWarningsForDraft(draft: ImportedRecipeDraft): ImportWarning[] {
  const warnings: ImportWarning[] = [];

  if (!draft.description || draft.description.trim().length === 0) {
    warnings.push({
      code: "DESCRIPTION_MISSING",
      field: "description",
      message: "Description was not detected. Add one if the recipe needs more context.",
    });
  }

  if (countSteps(draft.stepsMarkdown) < 2) {
    warnings.push({
      code: "STEPS_MAY_BE_INCOMPLETE",
      field: "stepsMarkdown",
      message: "Only one preparation step was detected. Review the instructions before continuing.",
    });
  }

  draft.ingredients.forEach((ingredient, index) => {
    if (ingredient.unit.trim().toLowerCase() !== "unit") {
      return;
    }

    warnings.push({
      code: "INGREDIENT_UNIT_NEEDS_REVIEW",
      field: `ingredients.${index}.unit`,
      message: 'Use a specific unit here, like tsp, cup, or lb.',
    });
  });

  return warnings;
}
