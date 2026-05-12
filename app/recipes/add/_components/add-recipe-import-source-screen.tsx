"use client";

import ImportRecipeForm, {
  type ImportRecipeSuccessResult,
} from "@/app/recipes/import/import-recipe-form";
import { type AddRecipeImportConfig } from "@/app/recipes/add/add-recipe-workflow";

type AddRecipeImportSourceScreenProps = {
  importConfig: AddRecipeImportConfig;
  onImportSucceeded: (importSessionId: string) => void;
};

export default function AddRecipeImportSourceScreen({
  importConfig,
  onImportSucceeded,
}: AddRecipeImportSourceScreenProps) {
  function handleImportSucceeded(result: ImportRecipeSuccessResult) {
    onImportSucceeded(result.importSessionId);
  }

  return (
    <ImportRecipeForm
      {...importConfig}
      defaultSourceImageVisibility="public"
      layoutVariant="embedded"
      onImportSucceeded={handleImportSucceeded}
    />
  );
}
