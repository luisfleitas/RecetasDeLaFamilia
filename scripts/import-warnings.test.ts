import assert from "node:assert/strict";
import { test } from "node:test";
import { getImportWarningsForDraft } from "../lib/application/recipes/import-warnings";

test("returns field warnings for missing description, short steps, and generic ingredient unit", () => {
  const warnings = getImportWarningsForDraft({
    title: "Toast",
    description: null,
    stepsMarkdown: "1. Toast bread.",
    ingredients: [
      {
        name: "bread",
        qty: 1,
        unit: "unit",
        notes: null,
        position: 1,
      },
    ],
  });

  assert.deepEqual(
    warnings.map((warning) => ({
      code: warning.code,
      field: warning.field,
    })),
    [
      { code: "DESCRIPTION_MISSING", field: "description" },
      { code: "STEPS_MAY_BE_INCOMPLETE", field: "stepsMarkdown" },
      { code: "INGREDIENT_UNIT_NEEDS_REVIEW", field: "ingredients.0.unit" },
    ],
  );
});

test("does not return warnings when draft looks complete", () => {
  const warnings = getImportWarningsForDraft({
    title: "Lemon Pasta",
    description: "Bright and quick dinner.",
    stepsMarkdown: "1. Boil pasta.\n2. Toss with sauce.",
    ingredients: [
      {
        name: "spaghetti",
        qty: 12,
        unit: "oz",
        notes: null,
        position: 1,
      },
    ],
  });

  assert.equal(warnings.length, 0);
});
