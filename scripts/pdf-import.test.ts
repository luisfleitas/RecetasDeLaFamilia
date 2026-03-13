import assert from "node:assert/strict";
import { test } from "node:test";
import { isPdfFile } from "../lib/application/recipes/pdf-import";

test("isPdfFile returns true for application/pdf mime", () => {
  const file = new File([new Uint8Array([1, 2, 3])], "recipe.bin", { type: "application/pdf" });
  assert.equal(isPdfFile(file), true);
});

test("isPdfFile returns true for .pdf extension", () => {
  const file = new File([new Uint8Array([1, 2, 3])], "recipe.PDF", { type: "application/octet-stream" });
  assert.equal(isPdfFile(file), true);
});

test("isPdfFile returns false for non-pdf file", () => {
  const file = new File([new Uint8Array([1, 2, 3])], "recipe.txt", { type: "text/plain" });
  assert.equal(isPdfFile(file), false);
});
