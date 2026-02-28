import assert from "node:assert/strict";
import { test } from "node:test";
import { importRecipeFromTextDocument } from "../lib/application/recipes/text-document-import";

test("imports recipe text with explicit sections", () => {
  const input = `
Lemon Pasta
Description: Bright and quick dinner.

Ingredients:
- 12 oz spaghetti
- 1 1/2 tbsp olive oil
- 2 cloves garlic, minced
- 1/2 cup parmesan

Steps:
1. Boil pasta.
2. Saute garlic.
3. Toss everything together.
`;

  const parsed = importRecipeFromTextDocument(input);

  assert.equal(parsed.title, "Lemon Pasta");
  assert.equal(parsed.description, "Bright and quick dinner.");
  assert.equal(parsed.ingredients.length, 4);
  assert.equal(parsed.ingredients[1].qty, 1.5);
  assert.equal(parsed.ingredients[1].unit.toLowerCase(), "tbsp");
  assert.match(parsed.stepsMarkdown, /^1\. Boil pasta\./);
});

test("imports recipe text with spanish headings", () => {
  const input = `
Nombre: Arroz con Pollo

Ingredientes:
- 2 tazas arroz
- 1 unidad pollo

Pasos:
- Dorar el pollo.
- Cocinar el arroz.
`;

  const parsed = importRecipeFromTextDocument(input);

  assert.equal(parsed.title, "Arroz con Pollo");
  assert.equal(parsed.ingredients[0].unit.toLowerCase(), "tazas");
  assert.match(parsed.stepsMarkdown, /1\. Dorar el pollo\./);
});

test("throws when ingredients are missing", () => {
  const input = `
Toast

Steps:
1. Toast bread.
`;

  assert.throws(
    () => importRecipeFromTextDocument(input),
    /Could not identify ingredients/,
  );
});

test("throws when steps are missing", () => {
  const input = `
Toast

Ingredients:
- 1 slice bread
`;

  assert.throws(
    () => importRecipeFromTextDocument(input),
    /Could not identify preparation steps/,
  );
});
