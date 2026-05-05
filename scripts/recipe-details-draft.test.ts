import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCreateRecipeDetailsPayload,
  createEmptyRecipeDetailsDraft,
  hydrateRecipeDetailsDraftFromImport,
  normalizeRecipeDetailsIngredients,
  validateRecipeDetailsDraft,
  type RecipeDetailsDraft,
} from "../lib/application/recipes/recipe-details-draft";
import type { ImportedRecipeDraft } from "../lib/application/recipes/text-document-import";
import type {
  ImportSessionMetadata,
  ImportSessionSourceRef,
} from "../lib/application/recipes/import-session-metadata";

function validDraft(overrides: Partial<RecipeDetailsDraft> = {}): RecipeDetailsDraft {
  return {
    ...createEmptyRecipeDetailsDraft(),
    title: "Arepas",
    stepsMarkdown: "Mix, shape, and cook.",
    ingredients: [
      {
        rowId: 1,
        name: "Harina PAN",
        qty: "2",
        unit: "cups",
        notes: "white corn",
      },
    ],
    ...overrides,
  };
}

test("creates an empty manual draft with one editable ingredient row", () => {
  const draft = createEmptyRecipeDetailsDraft();

  assert.deepEqual(draft, {
    title: "",
    description: "",
    stepsMarkdown: "",
    language: "en",
    ingredients: [{ rowId: 1, name: "", qty: "", unit: "", notes: "" }],
    newImages: [],
    primaryNewImageId: null,
    primarySourceDocumentId: null,
    visibility: "public",
    selectedFamilyIds: [],
    importSessionId: null,
    isImportComplete: false,
    importSourceRefs: [],
    importMetadata: null,
  });
});

test("hydrates an imported recipe draft while keeping recipe details unsaved", () => {
  const importedDraft: ImportedRecipeDraft = {
    title: "Sancocho",
    description: "Weekend soup",
    stepsMarkdown: "Simmer until tender.",
    language: "es",
    ingredients: [
      { name: "Yuca", qty: 1.5, unit: "lb", notes: null, position: 1 },
      { name: "Corn", qty: 2, unit: "ears", notes: "halved", position: 2 },
    ],
  };

  const draft = hydrateRecipeDetailsDraftFromImport(importedDraft, "session-123");

  assert.equal(draft.title, "Sancocho");
  assert.equal(draft.description, "Weekend soup");
  assert.equal(draft.stepsMarkdown, "Simmer until tender.");
  assert.equal(draft.language, "es");
  assert.equal(draft.importSessionId, "session-123");
  assert.equal(draft.isImportComplete, true);
  assert.deepEqual(draft.ingredients, [
    { rowId: 1, name: "Yuca", qty: "1.5", unit: "lb", notes: "" },
    { rowId: 2, name: "Corn", qty: "2", unit: "ears", notes: "halved" },
  ]);
});

test("hydrates imported source metadata for the unified add workflow", () => {
  const importedDraft: ImportedRecipeDraft = {
    title: "Pastelitos",
    description: null,
    stepsMarkdown: "Fill and fry.",
    language: "es",
    ingredients: [{ name: "Dough", qty: 1, unit: "batch", notes: null, position: 1 }],
  };
  const sourceRefs: ImportSessionSourceRef[] = [
    {
      id: 42,
      sourceType: "handwritten",
      originalFilename: "card-front.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1200,
      storageKey: "imports/card-front.jpg",
      pageNumber: 1,
    },
  ];
  const metadata: ImportSessionMetadata = {
    inputMode: "handwritten",
    sourceRefs,
    warnings: [],
    providerName: "openai",
    providerModel: "gpt-test",
    promptVersion: "v1",
    handwritten: {
      imageCount: 1,
      pageOrder: ["card-front.jpg"],
      ocrProviderUsed: "openai",
      ocrFallbackUsed: false,
      ocrProvidersByImage: ["openai"],
      reviewHints: ["Check ingredient amounts."],
      sourceImageVisibility: "public",
      combinedInUploadOrder: false,
    },
  };

  const draft = hydrateRecipeDetailsDraftFromImport(importedDraft, "session-456", {
    metadata,
    sourceRefs,
  });

  assert.equal(draft.importSessionId, "session-456");
  assert.equal(draft.isImportComplete, true);
  assert.equal(draft.primarySourceDocumentId, 42);
  assert.equal(draft.importMetadata?.handwritten?.sourceImageVisibility, "public");
  assert.deepEqual(draft.importSourceRefs.map((sourceRef) => sourceRef.originalFilename), ["card-front.jpg"]);
});

test("normalizes ingredients into numbered create payload rows", () => {
  const ingredients = normalizeRecipeDetailsIngredients([
    { rowId: 3, name: " Salt ", qty: "0.5", unit: " tsp ", notes: " optional " },
    { rowId: 9, name: "Water", qty: "2", unit: "cups", notes: "" },
  ]);

  assert.deepEqual(ingredients, [
    { name: "Salt", qty: 0.5, unit: "tsp", notes: "optional", position: 1 },
    { name: "Water", qty: 2, unit: "cups", notes: "", position: 2 },
  ]);
});

test("builds family visibility payload with only selected family ids", () => {
  const result = buildCreateRecipeDetailsPayload(
    validDraft({
      visibility: "family",
      selectedFamilyIds: [7, 11],
    }),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.ok ? result.payload : null, {
    title: "Arepas",
    description: "",
    stepsMarkdown: "Mix, shape, and cook.",
    language: "en",
    visibility: "family",
    familyIds: [7, 11],
    ingredients: [{ name: "Harina PAN", qty: 2, unit: "cups", notes: "white corn", position: 1 }],
    importSessionId: null,
    primaryMediaReference: null,
  });
});

test("returns image upload metadata with the selected primary image", () => {
  const result = buildCreateRecipeDetailsPayload(
    validDraft({
      newImages: [
        { id: 1, file: new File(["front"], "front.jpg", { type: "image/jpeg" }), previewUrl: "blob:front" },
        { id: 2, file: new File(["side"], "side.webp", { type: "image/webp" }), previewUrl: "blob:side" },
      ],
      primaryNewImageId: 2,
    }),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.ok
      ? result.imageUploads.map((image) => ({
          draftId: image.draftId,
          fileName: image.file.name,
          makePrimary: image.makePrimary,
        }))
      : null,
    [
      { draftId: 1, fileName: "front.jpg", makePrimary: false },
      { draftId: 2, fileName: "side.webp", makePrimary: true },
    ],
  );
});

test("builds a source-document primary media reference without marking new images primary", () => {
  const result = buildCreateRecipeDetailsPayload(
    validDraft({
      importSessionId: "session-123",
      importSourceRefs: [
        {
          id: 42,
          sourceType: "handwritten",
          originalFilename: "card-front.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1200,
          storageKey: "imports/card-front.jpg",
          pageNumber: 1,
        },
      ],
      primarySourceDocumentId: 42,
      newImages: [
        { id: 1, file: new File(["front"], "front.jpg", { type: "image/jpeg" }), previewUrl: "blob:front" },
      ],
      primaryNewImageId: 1,
    }),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.ok ? result.payload.primaryMediaReference : null, {
    type: "source-document",
    id: 42,
  });
  assert.equal(result.ok ? result.imageUploads[0]?.makePrimary : null, false);
});

test("reports validation errors before building an invalid create payload", () => {
  const errors = validateRecipeDetailsDraft(
    createEmptyRecipeDetailsDraft({
      visibility: "family",
      selectedFamilyIds: [],
    }),
  );

  assert.deepEqual(
    errors.map((error) => error.code),
    ["REQUIRED_TITLE", "REQUIRED_STEPS", "INVALID_INGREDIENT", "FAMILY_SELECTION_REQUIRED"],
  );
});
