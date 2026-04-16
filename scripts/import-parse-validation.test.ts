import assert from "node:assert/strict";
import { test } from "node:test";
import { toRecipeImportError } from "../lib/application/recipes/import-errors";
import { validateImportedRecipeDraft } from "../lib/application/recipes/import-parse-validation";

test("validateImportedRecipeDraft accepts a complete imported draft", () => {
  const draft = validateImportedRecipeDraft({
    title: " Toast ",
    description: " Quick snack ",
    stepsMarkdown: " 1. Toast bread. ",
    ingredients: [
      {
        name: " bread ",
        qty: 1,
        unit: " slice ",
        notes: " thick cut ",
        position: 99,
      },
    ],
  });

  assert.equal(draft.title, "Toast");
  assert.equal(draft.description, "Quick snack");
  assert.equal(draft.stepsMarkdown, "1. Toast bread.");
  assert.equal(draft.ingredients[0]?.name, "bread");
  assert.equal(draft.ingredients[0]?.unit, "slice");
  assert.equal(draft.ingredients[0]?.notes, "thick cut");
  assert.equal(draft.ingredients[0]?.position, 1);
});

test("validateImportedRecipeDraft allows a missing title during import parsing", () => {
  const draft = validateImportedRecipeDraft({
    title: "   ",
    description: null,
    stepsMarkdown: " 1. Toast bread. ",
    ingredients: [
      {
        name: " bread ",
        qty: 1,
        unit: " slice ",
        notes: null,
        position: 1,
      },
    ],
  });

  assert.equal(draft.title, "");
});

test("validateImportedRecipeDraft rejects missing required fields", () => {
  assert.throws(
    () =>
      validateImportedRecipeDraft({
        title: "Toast",
        description: null,
        stepsMarkdown: "",
        ingredients: [],
      }),
    /missing required ingredients or steps/i,
  );
});

test("toRecipeImportError maps unsupported file type to stable code", () => {
  const error = toRecipeImportError(
    new Error("Unsupported file type. Use TXT, DOCX, DOC, PDF, or an image file."),
  );

  assert.equal(error.code, "UNSUPPORTED_FILE_TYPE");
  assert.equal(error.status, 400);
});

test("toRecipeImportError maps provider failures to stable code", () => {
  const error = toRecipeImportError(new Error("OpenAI extraction provider is not implemented yet."));

  assert.equal(error.code, "PROVIDER_UNAVAILABLE");
  assert.equal(error.status, 503);
});
