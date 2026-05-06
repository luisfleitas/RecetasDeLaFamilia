import assert from "node:assert/strict";
import test from "node:test";
import {
  addRecipeWorkflowReducer,
  createInitialAddWorkflowState,
  getAddWorkflowSteps,
} from "../lib/application/recipes/add-workflow-state";

test("starts with only the start step available", () => {
  const state = createInitialAddWorkflowState();
  const steps = getAddWorkflowSteps(state);

  assert.equal(state.currentStep, "start");
  assert.equal(state.path, null);
  assert.deepEqual(
    steps.map((step) => ({
      id: step.id,
      status: step.status,
      isClickable: step.isClickable,
    })),
    [
      { id: "start", status: "current", isClickable: true },
      { id: "import-source", status: "future", isClickable: false },
      { id: "recipe-details", status: "future", isClickable: false },
    ],
  );
});

test("manual path advances directly to recipe details", () => {
  const state = addRecipeWorkflowReducer(createInitialAddWorkflowState(), {
    type: "choose-path",
    path: "manual",
  });

  assert.equal(state.path, "manual");
  assert.equal(state.currentStep, "recipe-details");
  assert.deepEqual(state.completedSteps, ["start"]);
  assert.deepEqual(
    getAddWorkflowSteps(state).map((step) => [step.id, step.status, step.isClickable]),
    [
      ["start", "complete", true],
      ["recipe-details", "current", true],
    ],
  );
});

test("import path exposes import source before recipe details", () => {
  const state = addRecipeWorkflowReducer(createInitialAddWorkflowState(), {
    type: "choose-path",
    path: "import",
  });

  assert.equal(state.path, "import");
  assert.equal(state.currentStep, "import-source");
  assert.deepEqual(
    getAddWorkflowSteps(state).map((step) => [step.id, step.status, step.isClickable]),
    [
      ["start", "complete", true],
      ["import-source", "current", true],
      ["recipe-details", "future", false],
    ],
  );
});

test("completed steps can be revisited but future steps stay disabled", () => {
  const importState = addRecipeWorkflowReducer(createInitialAddWorkflowState(), {
    type: "choose-path",
    path: "import",
  });

  const attemptedFutureState = addRecipeWorkflowReducer(importState, {
    type: "go-to-step",
    step: "recipe-details",
  });
  assert.equal(attemptedFutureState.currentStep, "import-source");

  const revisitedState = addRecipeWorkflowReducer(importState, {
    type: "go-to-step",
    step: "start",
  });
  assert.equal(revisitedState.currentStep, "start");
});

test("successful import stores the session and advances to recipe details", () => {
  const importState = addRecipeWorkflowReducer(createInitialAddWorkflowState(), {
    type: "choose-path",
    path: "import",
  });

  const state = addRecipeWorkflowReducer(importState, {
    type: "import-succeeded",
    importSessionId: "import-session-123",
  });

  assert.equal(state.currentStep, "recipe-details");
  assert.equal(state.importSessionId, "import-session-123");
  assert.deepEqual(state.completedSteps, ["start", "import-source"]);
});

test("start over resets all workflow state", () => {
  const importState = addRecipeWorkflowReducer(createInitialAddWorkflowState(), {
    type: "choose-path",
    path: "import",
  });
  const completedState = addRecipeWorkflowReducer(importState, {
    type: "import-succeeded",
    importSessionId: "import-session-123",
  });

  assert.deepEqual(
    addRecipeWorkflowReducer(completedState, { type: "start-over" }),
    createInitialAddWorkflowState(),
  );
});
