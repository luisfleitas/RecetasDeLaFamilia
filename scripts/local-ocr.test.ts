import assert from "node:assert/strict";
import { test } from "node:test";
import { isSupportedOcrMimeType } from "../lib/application/recipes/local-ocr";
import {
  getRecipeImportOcrConfidenceThreshold,
  hasRecipeImportOpenAiOcrFallback,
  shouldForceRecipeImportOpenAiOcr,
} from "../lib/application/recipes/import-config";
import { shouldUseOpenAiOcrFallback } from "../lib/application/recipes/openai-ocr";

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

test("ocr confidence threshold falls back to default for invalid values", () => {
  const previous = process.env.RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD;
  process.env.RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD = "2";

  try {
    assert.equal(getRecipeImportOcrConfidenceThreshold(), 0.8);
  } finally {
    if (previous == null) {
      delete process.env.RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD;
    } else {
      process.env.RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD = previous;
    }
  }
});

test("shouldUseOpenAiOcrFallback honors configured confidence threshold", () => {
  const previous = process.env.RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD;
  process.env.RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD = "0.9";

  try {
    assert.equal(shouldUseOpenAiOcrFallback(0.89), true);
    assert.equal(shouldUseOpenAiOcrFallback(0.9), false);
  } finally {
    if (previous == null) {
      delete process.env.RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD;
    } else {
      process.env.RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD = previous;
    }
  }
});

test("OpenAI OCR fallback config detects API key presence", () => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";

  try {
    assert.equal(hasRecipeImportOpenAiOcrFallback(), true);
  } finally {
    if (previous == null) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previous;
    }
  }
});

test("forced OpenAI OCR flag is off by default and enabled by env", () => {
  const previous = process.env.RECIPE_IMPORT_FORCE_OPENAI_OCR;

  try {
    delete process.env.RECIPE_IMPORT_FORCE_OPENAI_OCR;
    assert.equal(shouldForceRecipeImportOpenAiOcr(), false);

    process.env.RECIPE_IMPORT_FORCE_OPENAI_OCR = "true";
    assert.equal(shouldForceRecipeImportOpenAiOcr(), true);
  } finally {
    if (previous == null) {
      delete process.env.RECIPE_IMPORT_FORCE_OPENAI_OCR;
    } else {
      process.env.RECIPE_IMPORT_FORCE_OPENAI_OCR = previous;
    }
  }
});

test("shouldUseOpenAiOcrFallback always returns true when forced", () => {
  const previous = process.env.RECIPE_IMPORT_FORCE_OPENAI_OCR;

  try {
    process.env.RECIPE_IMPORT_FORCE_OPENAI_OCR = "true";
    assert.equal(shouldUseOpenAiOcrFallback(1), true);
  } finally {
    if (previous == null) {
      delete process.env.RECIPE_IMPORT_FORCE_OPENAI_OCR;
    } else {
      process.env.RECIPE_IMPORT_FORCE_OPENAI_OCR = previous;
    }
  }
});
