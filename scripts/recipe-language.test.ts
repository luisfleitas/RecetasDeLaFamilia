import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCreateRecipeInput } from "../lib/application/recipes/validation";
import { importRecipeFromTextDocument } from "../lib/application/recipes/text-document-import";

test("parseCreateRecipeInput defaults recipe language to english", () => {
  const parsed = parseCreateRecipeInput({
    title: "Toast",
    description: null,
    stepsMarkdown: "1. Toast bread.",
    visibility: "public",
    familyIds: [],
    ingredients: [
      {
        name: "bread",
        qty: 1,
        unit: "slice",
        notes: null,
        position: 1,
      },
    ],
  });

  assert.equal(parsed.language, "en");
});

test("parseCreateRecipeInput accepts supported recipe languages and rejects unsupported ones", () => {
  const parsed = parseCreateRecipeInput({
    title: "Arepas",
    description: null,
    stepsMarkdown: "1. Mezclar.",
    visibility: "public",
    language: "es",
    familyIds: [],
    ingredients: [
      {
        name: "harina",
        qty: 2,
        unit: "taza",
        notes: null,
        position: 1,
      },
    ],
  });

  assert.equal(parsed.language, "es");
  assert.throws(
    () =>
      parseCreateRecipeInput({
        title: "Toast",
        description: null,
        stepsMarkdown: "1. Toast bread.",
        visibility: "public",
        language: "fr",
        familyIds: [],
        ingredients: [
          {
            name: "bread",
            qty: 1,
            unit: "slice",
            notes: null,
            position: 1,
          },
        ],
      }),
    /language must be one of: en, es/i,
  );
});

test("importRecipeFromTextDocument infers spanish recipe language", () => {
  const parsed = importRecipeFromTextDocument(`
Nombre: Arroz con Pollo

Ingredientes:
- 2 tazas arroz

Pasos:
1. Cocinar el arroz.
`);

  assert.equal(parsed.language, "es");
});

test("importRecipeFromTextDocument infers english recipe language", () => {
  const parsed = importRecipeFromTextDocument(`
Garlic Toast

Ingredients:
- 1 slice bread

Steps:
1. Toast bread.
`);

  assert.equal(parsed.language, "en");
});
