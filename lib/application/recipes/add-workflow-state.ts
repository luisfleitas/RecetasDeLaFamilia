export type AddRecipePath = "manual" | "import";
export type AddRecipeStep = "start" | "import-source" | "recipe-details";
export type AddWorkflowStepStatus = "complete" | "current" | "future";

export type AddWorkflowState = {
  path: AddRecipePath | null;
  currentStep: AddRecipeStep;
  completedSteps: AddRecipeStep[];
  importSessionId: string | null;
};

export type AddWorkflowStepViewModel = {
  id: AddRecipeStep;
  status: AddWorkflowStepStatus;
  isClickable: boolean;
};

export type AddWorkflowEvent =
  | { type: "choose-path"; path: AddRecipePath }
  | { type: "go-to-step"; step: AddRecipeStep }
  | { type: "import-succeeded"; importSessionId: string }
  | { type: "start-over" };

const INITIAL_STATE: AddWorkflowState = {
  path: null,
  currentStep: "start",
  completedSteps: [],
  importSessionId: null,
};

const PATH_STEPS: Record<AddRecipePath, AddRecipeStep[]> = {
  manual: ["start", "recipe-details"],
  import: ["start", "import-source", "recipe-details"],
};

export function createInitialAddWorkflowState(): AddWorkflowState {
  return { ...INITIAL_STATE, completedSteps: [...INITIAL_STATE.completedSteps] };
}

function uniqueSteps(steps: AddRecipeStep[]): AddRecipeStep[] {
  return Array.from(new Set(steps));
}

function canVisitStep(state: AddWorkflowState, step: AddRecipeStep) {
  return step === state.currentStep || state.completedSteps.includes(step);
}

export function getAddWorkflowSteps(state: AddWorkflowState): AddWorkflowStepViewModel[] {
  const steps = state.path ? PATH_STEPS[state.path] : PATH_STEPS.import;

  return steps.map((step) => {
    const isComplete = state.completedSteps.includes(step);
    const status: AddWorkflowStepStatus = isComplete
      ? "complete"
      : step === state.currentStep
        ? "current"
        : "future";

    return {
      id: step,
      status,
      isClickable: status !== "future",
    };
  });
}

export function addRecipeWorkflowReducer(
  state: AddWorkflowState,
  event: AddWorkflowEvent,
): AddWorkflowState {
  switch (event.type) {
    case "choose-path":
      return {
        path: event.path,
        currentStep: event.path === "manual" ? "recipe-details" : "import-source",
        completedSteps: ["start"],
        importSessionId: null,
      };
    case "go-to-step":
      if (!canVisitStep(state, event.step)) {
        return state;
      }

      return {
        ...state,
        currentStep: event.step,
      };
    case "import-succeeded":
      if (state.path !== "import") {
        return state;
      }

      return {
        ...state,
        currentStep: "recipe-details",
        completedSteps: uniqueSteps([...state.completedSteps, "import-source"]),
        importSessionId: event.importSessionId,
      };
    case "start-over":
      return createInitialAddWorkflowState();
    default:
      return state;
  }
}
