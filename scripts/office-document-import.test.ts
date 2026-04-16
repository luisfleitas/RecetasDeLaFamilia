import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isDocFile,
  isDocxFile,
} from "../lib/application/recipes/office-document-import";

test("isDocxFile returns true for docx mime", () => {
  const file = new File([new Uint8Array([1, 2, 3])], "recipe.bin", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  assert.equal(isDocxFile(file), true);
});

test("isDocxFile returns true for docx extension", () => {
  const file = new File([new Uint8Array([1, 2, 3])], "recipe.DOCX", {
    type: "application/octet-stream",
  });
  assert.equal(isDocxFile(file), true);
});

test("isDocFile returns true for doc mime", () => {
  const file = new File([new Uint8Array([1, 2, 3])], "recipe.bin", {
    type: "application/msword",
  });
  assert.equal(isDocFile(file), true);
});

test("isDocFile returns true for doc extension", () => {
  const file = new File([new Uint8Array([1, 2, 3])], "recipe.DOC", {
    type: "application/octet-stream",
  });
  assert.equal(isDocFile(file), true);
});

test("office document detectors reject non-office files", () => {
  const file = new File([new Uint8Array([1, 2, 3])], "recipe.txt", {
    type: "text/plain",
  });
  assert.equal(isDocxFile(file), false);
  assert.equal(isDocFile(file), false);
});
