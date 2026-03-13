import assert from "node:assert/strict";
import { test } from "node:test";
import {
  RecipeImportParseTimeoutError,
  withRecipeImportParseTimeout,
} from "../lib/application/recipes/import-timeout";
import { getRecipeImportParseTimeoutMs } from "../lib/application/recipes/import-config";

test("getRecipeImportParseTimeoutMs falls back to default for invalid values", () => {
  const previous = process.env.RECIPE_IMPORT_PARSE_TIMEOUT_MS;
  process.env.RECIPE_IMPORT_PARSE_TIMEOUT_MS = "0";

  try {
    assert.equal(getRecipeImportParseTimeoutMs(), 30000);
  } finally {
    if (previous == null) {
      delete process.env.RECIPE_IMPORT_PARSE_TIMEOUT_MS;
    } else {
      process.env.RECIPE_IMPORT_PARSE_TIMEOUT_MS = previous;
    }
  }
});

test("withRecipeImportParseTimeout resolves before timeout", async () => {
  const previous = process.env.RECIPE_IMPORT_PARSE_TIMEOUT_MS;
  process.env.RECIPE_IMPORT_PARSE_TIMEOUT_MS = "50";

  try {
    const result = await withRecipeImportParseTimeout(async () => "ok");
    assert.equal(result, "ok");
  } finally {
    if (previous == null) {
      delete process.env.RECIPE_IMPORT_PARSE_TIMEOUT_MS;
    } else {
      process.env.RECIPE_IMPORT_PARSE_TIMEOUT_MS = previous;
    }
  }
});

test("withRecipeImportParseTimeout rejects timed out work", async () => {
  const previous = process.env.RECIPE_IMPORT_PARSE_TIMEOUT_MS;
  process.env.RECIPE_IMPORT_PARSE_TIMEOUT_MS = "10";

  try {
    await assert.rejects(
      () =>
        withRecipeImportParseTimeout(
          async () =>
            await new Promise((resolve) => {
              setTimeout(() => resolve("late"), 50);
            }),
        ),
      RecipeImportParseTimeoutError,
    );
  } finally {
    if (previous == null) {
      delete process.env.RECIPE_IMPORT_PARSE_TIMEOUT_MS;
    } else {
      process.env.RECIPE_IMPORT_PARSE_TIMEOUT_MS = previous;
    }
  }
});
