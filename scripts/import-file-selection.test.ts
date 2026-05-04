import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveRecipeImportFileSelection } from "../lib/application/recipes/import-file-selection";

function file(name: string, type: string): File {
  return new File(["sample"], name, { type });
}

test("document upload multi-select routes image batches to handwritten parsing", () => {
  const selection = resolveRecipeImportFileSelection({
    files: [
      file("front.jpg", "image/jpeg"),
      file("back.png", "image/png"),
    ],
    handwrittenEnabled: true,
  });

  assert.equal(selection.kind, "handwritten-images");
  assert.equal(selection.files.length, 2);
});

test("document upload rejects multiple mixed source files", () => {
  const selection = resolveRecipeImportFileSelection({
    files: [
      file("recipe.pdf", "application/pdf"),
      file("photo.jpg", "image/jpeg"),
    ],
    handwrittenEnabled: true,
  });

  assert.equal(selection.kind, "error");
  assert.equal(selection.message, "Select one document file or multiple image files.");
});
