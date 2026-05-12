"use client";

import { useMessages } from "@/app/_components/locale-provider";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import { type AddRecipePath } from "@/lib/application/recipes/add-workflow-state";

type AddRecipeStartScreenProps = {
  isRecipeImportEnabled: boolean;
  onChoosePath: (path: AddRecipePath) => void;
};

export default function AddRecipeStartScreen({
  isRecipeImportEnabled,
  onChoosePath,
}: AddRecipeStartScreenProps) {
  const messages = useMessages();

  return (
    <section id="add-recipe-start-screen" className="surface-panel grid gap-4 p-5">
      <div id="add-recipe-start-copy" className="recipe-form-section-copy">
        <h2 id="add-recipe-start-title" className="recipe-form-section-title">
          {messages.recipe.addWorkflowStartTitle}
        </h2>
        <p id="add-recipe-start-description" className="recipe-form-section-description">
          {messages.recipe.addWorkflowStartDescription}
        </p>
      </div>

      <div id="add-recipe-start-options" className="grid gap-3 md:grid-cols-2">
        <button
          id="add-recipe-import-choice"
          type="button"
          className={buttonClassName("secondary", "min-h-24 flex-col items-start gap-2 text-left leading-normal")}
          disabled={!isRecipeImportEnabled}
          onClick={() => onChoosePath("import")}
        >
          <span id="add-recipe-import-choice-title">{messages.recipe.addWorkflowImportChoiceTitle}</span>
          <span id="add-recipe-import-choice-description" className="text-sm font-medium text-[var(--color-text-muted)]">
            {messages.recipe.addWorkflowImportChoiceDescription}
          </span>
        </button>
        <button
          id="add-recipe-manual-choice"
          type="button"
          className={buttonClassName("primary", "min-h-24 flex-col items-start gap-2 text-left leading-normal")}
          onClick={() => onChoosePath("manual")}
        >
          <span id="add-recipe-manual-choice-title">{messages.recipe.addWorkflowManualChoiceTitle}</span>
          <span id="add-recipe-manual-choice-description" className="text-sm font-medium opacity-90">
            {messages.recipe.addWorkflowManualChoiceDescription}
          </span>
        </button>
      </div>
    </section>
  );
}
