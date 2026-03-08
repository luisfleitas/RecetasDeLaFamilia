import assert from "node:assert/strict";
import { test } from "node:test";
import { isSupportedOcrMimeType } from "../lib/application/recipes/local-ocr";

test("isSupportedOcrMimeType accepts supported image formats", () => {
  assert.equal(isSupportedOcrMimeType("image/jpeg"), true);
  assert.equal(isSupportedOcrMimeType("image/png"), true);
  assert.equal(isSupportedOcrMimeType("image/webp"), true);
  assert.equal(isSupportedOcrMimeType("image/tiff"), true);
  assert.equal(isSupportedOcrMimeType("image/bmp"), true);
});

test("isSupportedOcrMimeType rejects unsupported formats", () => {
  assert.equal(isSupportedOcrMimeType("application/pdf"), false);
  assert.equal(isSupportedOcrMimeType("text/plain"), false);
});
