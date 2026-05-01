import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeRecipeFamilyLinksForUpdate } from "../lib/application/recipes/family-link-sanitization";
import type { CreateRecipeInput } from "../lib/domain/recipe";

function sampleInput(overrides?: Partial<CreateRecipeInput>): CreateRecipeInput {
  return {
    title: "Recipe",
    description: null,
    stepsMarkdown: "Steps",
    language: "en",
    visibility: "family",
    familyIds: [10, 20],
    ingredients: [
      {
        name: "Salt",
        qty: 1,
        unit: "tsp",
        notes: null,
        position: 1,
      },
    ],
    ...overrides,
  };
}

test("keeps only allowed families for family visibility", () => {
  const input = sampleInput({ familyIds: [10, 20, 10, 30] });
  const result = sanitizeRecipeFamilyLinksForUpdate(input, [20, 30]);

  assert.equal(result.visibility, "family");
  assert.deepEqual(result.familyIds, [20, 30]);
});

test("falls back to private when all family links are stale/forbidden", () => {
  const input = sampleInput({ familyIds: [99] });
  const result = sanitizeRecipeFamilyLinksForUpdate(input, []);

  assert.equal(result.visibility, "private");
  assert.deepEqual(result.familyIds, []);
});

test("non-family visibility always clears family links", () => {
  const input = sampleInput({ visibility: "public", familyIds: [10] });
  const result = sanitizeRecipeFamilyLinksForUpdate(input, [10]);

  assert.equal(result.visibility, "public");
  assert.deepEqual(result.familyIds, []);
});
