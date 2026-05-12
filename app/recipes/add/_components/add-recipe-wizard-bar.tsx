"use client";

import { useMessages } from "@/app/_components/locale-provider";
import { type AddRecipeStep, type AddWorkflowStepViewModel } from "@/lib/application/recipes/add-workflow-state";

type AddRecipeWizardBarProps = {
  activeStep: AddRecipeStep;
  onStepSelect: (step: AddRecipeStep) => void;
  steps: AddWorkflowStepViewModel[];
};

function stepLabel(step: AddRecipeStep, messages: ReturnType<typeof useMessages>) {
  const labels: Record<AddRecipeStep, string> = {
    start: messages.recipe.addWorkflowStepStart,
    "import-source": messages.recipe.addWorkflowStepImportSource,
    "recipe-details": messages.recipe.addWorkflowStepRecipeDetails,
  };

  return labels[step];
}

export default function AddRecipeWizardBar({ activeStep, onStepSelect, steps }: AddRecipeWizardBarProps) {
  const messages = useMessages();

  return (
    <nav id="add-recipe-wizard-bar" aria-label={messages.recipe.addWorkflowWizardLabel}>
      <ol id="add-recipe-wizard-list" className="secondary-tab-strip">
        {steps.map((step) => (
          <li id={`add-recipe-wizard-item-${step.id}`} key={step.id}>
            <button
              id={`add-recipe-wizard-step-${step.id}`}
              type="button"
              className="secondary-tab-strip-item"
              data-active={step.id === activeStep}
              disabled={!step.isClickable}
              aria-current={step.id === activeStep ? "step" : undefined}
              onClick={() => onStepSelect(step.id)}
            >
              {stepLabel(step.id, messages)}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
