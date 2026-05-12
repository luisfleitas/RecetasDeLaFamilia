"use client";

import type { FamilyWorkflowStepViewModel } from "@/lib/application/families/workflow-state";

type FamilyWizardBarProps<TStep extends string> = {
  activeStep: TStep;
  ariaLabel: string;
  idPrefix: string;
  onStepSelect: (step: TStep) => void;
  steps: FamilyWorkflowStepViewModel<TStep>[];
};

export default function FamilyWizardBar<TStep extends string>({
  activeStep,
  ariaLabel,
  idPrefix,
  onStepSelect,
  steps,
}: FamilyWizardBarProps<TStep>) {
  return (
    <nav id={`${idPrefix}-wizard-bar`} aria-label={ariaLabel}>
      <ol id={`${idPrefix}-wizard-list`} className="secondary-tab-strip">
        {steps.map((step) => (
          <li id={`${idPrefix}-wizard-item-${step.id}`} key={step.id}>
            <button
              id={`${idPrefix}-step-${step.id}`}
              type="button"
              className="secondary-tab-strip-item"
              data-active={step.id === activeStep}
              disabled={!step.isClickable}
              aria-current={step.id === activeStep ? "step" : undefined}
              onClick={() => onStepSelect(step.id)}
            >
              {step.label}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
