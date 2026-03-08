import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getRecipeImportParseRateLimitMax,
  getRecipeImportParseRateLimitWindowMs,
} from "../lib/application/recipes/import-config";
import { checkRecipeImportParseRateLimit } from "../lib/application/recipes/import-rate-limit";

test("recipe import parse rate limit config falls back to defaults for invalid values", () => {
  const previousMax = process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_MAX;
  const previousWindow = process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_WINDOW_MS;
  process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_MAX = "0";
  process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_WINDOW_MS = "-1";

  try {
    assert.equal(getRecipeImportParseRateLimitMax(), 10);
    assert.equal(getRecipeImportParseRateLimitWindowMs(), 5 * 60 * 1000);
  } finally {
    if (previousMax == null) {
      delete process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_MAX;
    } else {
      process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_MAX = previousMax;
    }

    if (previousWindow == null) {
      delete process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_WINDOW_MS;
    } else {
      process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_WINDOW_MS = previousWindow;
    }
  }
});

test("recipe import parse rate limiter blocks requests above threshold within window", () => {
  const previousMax = process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_MAX;
  const previousWindow = process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_WINDOW_MS;
  process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_MAX = "2";
  process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_WINDOW_MS = "60000";

  const userId = Date.now();

  try {
    const first = checkRecipeImportParseRateLimit(userId);
    const second = checkRecipeImportParseRateLimit(userId);
    const third = checkRecipeImportParseRateLimit(userId);

    assert.equal(first.allowed, true);
    assert.equal(second.allowed, true);
    assert.equal(third.allowed, false);
    assert.ok(third.retryAfterSeconds > 0);
  } finally {
    if (previousMax == null) {
      delete process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_MAX;
    } else {
      process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_MAX = previousMax;
    }

    if (previousWindow == null) {
      delete process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_WINDOW_MS;
    } else {
      process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_WINDOW_MS = previousWindow;
    }
  }
});
