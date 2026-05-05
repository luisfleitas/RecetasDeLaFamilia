"use client";

import { useReducer } from "react";
import { useMessages } from "@/app/_components/locale-provider";
import AddRecipeDetailsScreen from "@/app/recipes/add/_components/add-recipe-details-screen";
import AddRecipeImportSourceScreen from "@/app/recipes/add/_components/add-recipe-import-source-screen";
import AddRecipeStartOverDialog from "@/app/recipes/add/_components/add-recipe-start-over-dialog";
import AddRecipeStartScreen from "@/app/recipes/add/_components/add-recipe-start-screen";
import AddRecipeWizardBar from "@/app/recipes/add/_components/add-recipe-wizard-bar";
import {
  addRecipeWorkflowReducer,
  createInitialAddWorkflowState,
  getAddWorkflowSteps,
  type AddRecipePath,
  type AddRecipeStep,
} from "@/lib/application/recipes/add-workflow-state";

export type AddRecipeImportConfig = {
  handwrittenBlobUploadPathPrefix: string;
  handwrittenEnabled: boolean;
  handwrittenMaxImageBytes: number;
  handwrittenMaxImageCount: number;
  handwrittenMaxUploadBytes: number;
  handwrittenSourceUploadMode: "blob" | "server";
  isRecipeImportEnabled: boolean;
};

export default function AddRecipeWorkflow(props: AddRecipeImportConfig) {
  const messages = useMessages();
  const [state, dispatch] = useReducer(addRecipeWorkflowReducer, undefined, createInitialAddWorkflowState);
  const steps = getAddWorkflowSteps(state);

  function choosePath(path: AddRecipePath) {
    dispatch({ type: "choose-path", path });
  }

  function goToStep(step: AddRecipeStep) {
    dispatch({ type: "go-to-step", step });
  }

  function handleImportSucceeded(importSessionId: string) {
    dispatch({ type: "import-succeeded", importSessionId });
  }

  return (
    <main id="add-recipe-workflow" className="app-shell">
      <div className="grid gap-5">
        <header id="add-recipe-header" className="page-header-bar">
          <div id="add-recipe-header-copy" className="page-header-copy">
            <p id="add-recipe-eyebrow" className="page-eyebrow">
              {messages.recipe.addWorkflowEyebrow}
            </p>
            <h1 id="add-recipe-title" className="text-3xl font-bold tracking-normal">
              {messages.recipe.addWorkflowTitle}
            </h1>
            <p id="add-recipe-supporting-text" className="page-supporting-text">
              {messages.recipe.addWorkflowSupport}
            </p>
          </div>
          <AddRecipeStartOverDialog
            isVisible={state.currentStep !== "start" || state.path !== null}
            onStartOver={() => dispatch({ type: "start-over" })}
          />
        </header>

        <AddRecipeWizardBar
          activeStep={state.currentStep}
          onStepSelect={goToStep}
          steps={steps}
        />

        {state.currentStep === "start" ? (
          <AddRecipeStartScreen
            isRecipeImportEnabled={props.isRecipeImportEnabled}
            onChoosePath={choosePath}
          />
        ) : null}
        {state.currentStep === "import-source" ? (
          <AddRecipeImportSourceScreen
            importConfig={props}
            onImportSucceeded={handleImportSucceeded}
          />
        ) : null}
        {state.currentStep === "recipe-details" ? (
          <AddRecipeDetailsScreen importSessionId={state.importSessionId} path={state.path} />
        ) : null}
      </div>
    </main>
  );
}
