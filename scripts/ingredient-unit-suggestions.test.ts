import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_INGREDIENT_UNITS,
  buildIngredientUnitSuggestions,
  isTypedIngredientUnitAllowed,
} from "../lib/application/recipes/ingredient-unit-suggestions";

test("starts with canonical ingredient units from the workflow requirements", () => {
  const suggestions = buildIngredientUnitSuggestions({
    ingredients: [],
    typedValue: "",
  });

  assert.deepEqual(suggestions.slice(0, 6), ["cup", "teaspoon", "tablespoon", "can", "unit", "piece"]);
  assert.deepEqual(CANONICAL_INGREDIENT_UNITS.slice(-4), ["gallon", "fluid ounce", "to taste", "other"]);
});

test("dedupes canonical and custom units case-insensitively", () => {
  const suggestions = buildIngredientUnitSuggestions({
    ingredients: [
      { rowId: 1, unit: "Cup" },
      { rowId: 2, unit: "cup" },
      { rowId: 3, unit: "Ears" },
      { rowId: 4, unit: "ears" },
    ],
    typedValue: "",
  });

  assert.equal(suggestions.filter((unit) => unit.toLowerCase() === "cup").length, 1);
  assert.equal(suggestions.filter((unit) => unit.toLowerCase() === "ears").length, 1);
  assert.ok(suggestions.indexOf("cup") < suggestions.indexOf("ears"));
});

test("uses custom units only from the current recipe draft", () => {
  const suggestions = buildIngredientUnitSuggestions({
    ingredients: [
      { rowId: 1, unit: "ears" },
      { rowId: 2, unit: "scoops" },
    ],
    typedValue: "",
  });

  assert.ok(suggestions.includes("ears"));
  assert.ok(suggestions.includes("scoops"));
  assert.equal(suggestions.includes("bushels"), false);
});

test("filters suggestions by the typed value while preserving custom matches", () => {
  const suggestions = buildIngredientUnitSuggestions({
    ingredients: [
      { rowId: 1, unit: "ears" },
      { rowId: 2, unit: "each" },
      { rowId: 3, unit: "scoop" },
    ],
    typedValue: "ea",
  });

  assert.deepEqual(suggestions, ["teaspoon", "ears", "each"]);
});

test("allows typed custom unit values without adding them globally", () => {
  assert.equal(isTypedIngredientUnitAllowed("handful"), true);
  assert.deepEqual(
    buildIngredientUnitSuggestions({
      ingredients: [],
      typedValue: "handful",
    }),
    [],
  );
});
