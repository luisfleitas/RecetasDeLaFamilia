import type { CreateIngredientInput } from "@/lib/domain/recipe";
import type { RecipeLanguage } from "@/lib/domain/recipe-language";
import type { ImportedRecipeDraft } from "@/lib/application/recipes/text-document-import";
import type {
  ImportSessionMetadata,
  ImportSessionSourceRef,
} from "@/lib/application/recipes/import-session-metadata";
import type { RecipeMediaReference } from "@/lib/application/recipes/recipe-media-groups";

export type RecipeDetailsVisibility = "public" | "private" | "family";

export type RecipeDetailsIngredientDraft = {
  rowId: number;
  name: string;
  qty: string;
  unit: string;
  notes: string;
};

export type RecipeDetailsImageDraft = {
  id: number;
  file: File;
  previewUrl: string;
};

export type RecipeDetailsSourceDocumentDraft = {
  id: number;
  originalFilename: string;
  thumbnailUrl: string;
  fullUrl: string;
  publiclyVisible: boolean;
};

export type RecipeDetailsDraft = {
  title: string;
  description: string;
  stepsMarkdown: string;
  language: RecipeLanguage;
  ingredients: RecipeDetailsIngredientDraft[];
  newImages: RecipeDetailsImageDraft[];
  primaryNewImageId: number | null;
  primarySourceDocumentId: number | null;
  visibility: RecipeDetailsVisibility;
  selectedFamilyIds: number[];
  importSessionId: string | null;
  isImportComplete: boolean;
  importSourceRefs: ImportSessionSourceRef[];
  importMetadata: ImportSessionMetadata | null;
};

export type RecipeDetailsValidationCode =
  | "REQUIRED_TITLE"
  | "REQUIRED_STEPS"
  | "MISSING_INGREDIENT"
  | "INVALID_INGREDIENT"
  | "FAMILY_SELECTION_REQUIRED"
  | "PRIMARY_IMAGE_NOT_FOUND";

export type RecipeDetailsValidationError = {
  code: RecipeDetailsValidationCode;
};

export type CreateRecipeDetailsPayload = {
  title: string;
  description: string;
  stepsMarkdown: string;
  language: RecipeLanguage;
  visibility: RecipeDetailsVisibility;
  familyIds: number[];
  ingredients: CreateIngredientInput[];
  importSessionId: string | null;
  primaryMediaReference: RecipeMediaReference | null;
};

export type RecipeDetailsImageUpload = {
  draftId: number;
  file: File;
  makePrimary: boolean;
};

export type BuildCreateRecipeDetailsPayloadResult =
  | {
      ok: true;
      payload: CreateRecipeDetailsPayload;
      imageUploads: RecipeDetailsImageUpload[];
    }
  | {
      ok: false;
      errors: RecipeDetailsValidationError[];
    };

export const EMPTY_RECIPE_DETAILS_INGREDIENT: RecipeDetailsIngredientDraft = {
  rowId: 1,
  name: "",
  qty: "",
  unit: "",
  notes: "",
};

export function createEmptyRecipeDetailsDraft(overrides: Partial<RecipeDetailsDraft> = {}): RecipeDetailsDraft {
  return {
    title: "",
    description: "",
    stepsMarkdown: "",
    language: "en",
    ingredients: [EMPTY_RECIPE_DETAILS_INGREDIENT],
    newImages: [],
    primaryNewImageId: null,
    primarySourceDocumentId: null,
    visibility: "public",
    selectedFamilyIds: [],
    importSessionId: null,
    isImportComplete: false,
    importSourceRefs: [],
    importMetadata: null,
    ...overrides,
  };
}

export function toIngredientDraftsFromImportedDraft(draft: ImportedRecipeDraft): RecipeDetailsIngredientDraft[] {
  if (draft.ingredients.length === 0) {
    return [EMPTY_RECIPE_DETAILS_INGREDIENT];
  }

  return draft.ingredients.map((ingredient, index) => ({
    rowId: index + 1,
    name: ingredient.name,
    qty: ingredient.qty.toString(),
    unit: ingredient.unit,
    notes: ingredient.notes ?? "",
  }));
}

export function hydrateRecipeDetailsDraftFromImport(
  draft: ImportedRecipeDraft,
  importSessionId: string,
  importContext: {
    sourceRefs?: ImportSessionSourceRef[];
    metadata?: ImportSessionMetadata | null;
  } = {},
): RecipeDetailsDraft {
  return createEmptyRecipeDetailsDraft({
    title: draft.title ?? "",
    description: draft.description ?? "",
    stepsMarkdown: draft.stepsMarkdown ?? "",
    language: draft.language ?? "en",
    ingredients: toIngredientDraftsFromImportedDraft(draft),
    importSessionId,
    isImportComplete: true,
    importSourceRefs: importContext.sourceRefs ?? [],
    importMetadata: importContext.metadata ?? null,
    primarySourceDocumentId: importContext.sourceRefs?.find((sourceRef) => typeof sourceRef.id === "number")?.id ?? null,
  });
}

export function normalizeRecipeDetailsIngredients(
  ingredients: RecipeDetailsIngredientDraft[],
): CreateIngredientInput[] {
  return ingredients.map((ingredient, index) => ({
    name: ingredient.name.trim(),
    qty: Number(ingredient.qty),
    unit: ingredient.unit.trim(),
    notes: ingredient.notes.trim(),
    position: index + 1,
  }));
}

export function validateRecipeDetailsDraft(draft: RecipeDetailsDraft): RecipeDetailsValidationError[] {
  const errors: RecipeDetailsValidationError[] = [];
  const ingredients = normalizeRecipeDetailsIngredients(draft.ingredients);

  if (!draft.title.trim()) {
    errors.push({ code: "REQUIRED_TITLE" });
  }

  if (!draft.stepsMarkdown.trim()) {
    errors.push({ code: "REQUIRED_STEPS" });
  }

  if (ingredients.length === 0) {
    errors.push({ code: "MISSING_INGREDIENT" });
  } else if (
    ingredients.some(
      (ingredient) =>
        ingredient.name.length === 0 ||
        ingredient.unit.length === 0 ||
        !Number.isFinite(ingredient.qty) ||
        ingredient.qty <= 0 ||
        ingredient.position < 1,
    )
  ) {
    errors.push({ code: "INVALID_INGREDIENT" });
  }

  if (draft.visibility === "family" && draft.selectedFamilyIds.length === 0) {
    errors.push({ code: "FAMILY_SELECTION_REQUIRED" });
  }

  if (
    draft.primaryNewImageId != null &&
    !draft.newImages.some((image) => image.id === draft.primaryNewImageId)
  ) {
    errors.push({ code: "PRIMARY_IMAGE_NOT_FOUND" });
  }

  if (
    draft.primarySourceDocumentId != null &&
    !draft.importSourceRefs.some((sourceRef) => sourceRef.id === draft.primarySourceDocumentId)
  ) {
    errors.push({ code: "PRIMARY_IMAGE_NOT_FOUND" });
  }

  return errors;
}

export function buildCreateRecipeDetailsPayload(
  draft: RecipeDetailsDraft,
): BuildCreateRecipeDetailsPayloadResult {
  const errors = validateRecipeDetailsDraft(draft);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    payload: {
      title: draft.title.trim(),
      description: draft.description.trim(),
      stepsMarkdown: draft.stepsMarkdown.trim(),
      language: draft.language,
      visibility: draft.visibility,
      familyIds: draft.visibility === "family" ? draft.selectedFamilyIds : [],
      ingredients: normalizeRecipeDetailsIngredients(draft.ingredients),
      importSessionId: draft.importSessionId,
      primaryMediaReference:
        draft.primarySourceDocumentId != null
          ? { type: "source-document", id: draft.primarySourceDocumentId }
          : null,
    },
    imageUploads: draft.newImages.map((image) => ({
      draftId: image.id,
      file: image.file,
      makePrimary: draft.primarySourceDocumentId == null && draft.primaryNewImageId === image.id,
    })),
  };
}
