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
  assert.equal(parsed.ingredients[0].unit.toLowerCase(), "taza");
  assert.match(parsed.stepsMarkdown, /1\. Dorar el pollo\./);
});

test("imports spanish recipe with ingredient bullets and preparacion without colon", () => {
  const input = `
Paella para 20 personas.

- 10 tazas del arroz del bueno
- 1 kilo de camarones
- 1 kilo de guacucos
- 2 sobres de carmencita (color)

Preparacion

Se frie el pollo.
Se agrega el arroz y se cocina a fuego lento.
`;

  const parsed = importRecipeFromTextDocument(input);

  assert.equal(parsed.title, "Paella para 20 personas.");
  assert.equal(parsed.ingredients.length, 4);
  assert.equal(parsed.ingredients[0]?.qty, 10);
  assert.match(parsed.stepsMarkdown, /1\. Se frie el pollo\./);
});

test("normalizes noisy spanish ingredient lines", () => {
  const input = `
Receta de prueba

Ingredientes:
- 10 tazas del arroz del bueno. ?.
- 1 kilo de guacucos.

Pasos:
- Mezclar.
`;

  const parsed = importRecipeFromTextDocument(input);

  assert.equal(parsed.ingredients[0]?.name.toLowerCase(), "arroz");
  assert.equal(parsed.ingredients[0]?.qty, 10);
  assert.equal(parsed.ingredients[0]?.unit.toLowerCase(), "taza");
  assert.equal(parsed.ingredients[1]?.name.toLowerCase(), "guacucos");
  assert.equal(parsed.ingredients[1]?.qty, 1);
  assert.equal(parsed.ingredients[1]?.unit.toLowerCase(), "kilo");
});

test("parses unicode fractions and normalizes vino descriptors", () => {
  const input = `
Sangria

Ingredientes:
- ½ taza vino tinto dulce

Pasos:
- Mezclar.
`;

  const parsed = importRecipeFromTextDocument(input);

  assert.equal(parsed.ingredients[0]?.qty, 0.5);
  assert.equal(parsed.ingredients[0]?.unit.toLowerCase(), "taza");
  assert.equal(parsed.ingredients[0]?.name.toLowerCase(), "vino dulce");
});

test("imports unstructured english recipe without ingredients header", () => {
  const input = `
Garlic Butter Shrimp

- 1 lb shrimp
- 2 tbsp butter
- 3 cloves garlic, minced
- 1 tsp salt

Instructions

Melt butter in a skillet.
Add garlic and cook for 30 seconds.
Add shrimp and cook until pink.
`;

  const parsed = importRecipeFromTextDocument(input);

  assert.equal(parsed.title, "Garlic Butter Shrimp");
  assert.equal(parsed.ingredients.length, 4);
  assert.equal(parsed.ingredients[0]?.qty, 1);
  assert.match(parsed.stepsMarkdown, /1\. Melt butter in a skillet\./);
});

test("imports unstructured spanish recipe without ingredientes header", () => {
  const input = `
Arepas con Queso

- 2 tazas harina de maiz
- 2 tazas agua
- 1 taza queso rallado
- 1 cucharadita sal

Preparacion

Mezclar todos los ingredientes.
Formar las arepas.
Cocinar en budare caliente.
`;

  const parsed = importRecipeFromTextDocument(input);

  assert.equal(parsed.title, "Arepas con Queso");
  assert.equal(parsed.ingredients.length, 4);
  assert.equal(parsed.ingredients[0]?.unit.toLowerCase(), "taza");
  assert.match(parsed.stepsMarkdown, /1\. Mezclar todos los ingredientes\./);
});

test("infers ingredients when they are only referenced inside steps", () => {
  const input = `
Panqueques Caseros

Pasos:
1. Mezcla harina y huevos en un bowl.
2. Agrega leche y azucar lentamente.
3. Cocina la mezcla en un sarten caliente.
`;

  const parsed = importRecipeFromTextDocument(input);

  assert.equal(parsed.title, "Panqueques Caseros");
  assert.equal(parsed.ingredients.length, 4);
  assert.deepEqual(
    parsed.ingredients.map((ingredient) => ingredient.name.toLowerCase()),
    ["harina", "huevos", "leche", "azucar"],
  );
  assert.match(parsed.stepsMarkdown, /1\. Mezcla harina y huevos en un bowl\./);
});

test("infers measured ingredients from english steps", () => {
  const input = `
Toast

Steps:
1. Toast bread.
2. add 1 tsp of butter
3. Add 2 grams of cheese and ham
4. Grill for 10 minutes
`;

  const parsed = importRecipeFromTextDocument(input);
  assert.deepEqual(
    parsed.ingredients.map((ingredient) => ({
      name: ingredient.name.toLowerCase(),
      qty: ingredient.qty,
      unit: ingredient.unit.toLowerCase(),
    })),
    [
      { name: "butter", qty: 1, unit: "tsp" },
      { name: "cheese", qty: 2, unit: "gram" },
      { name: "ham", qty: 2, unit: "gram" },
    ],
  );
});

test("imports text without a detectable title when ingredients and steps exist", () => {
  const input = `
Ingredients:
- 1 slice bread

Steps:
1. Toast bread.
`;

  const parsed = importRecipeFromTextDocument(input);

  assert.equal(parsed.title, "");
  assert.equal(parsed.ingredients.length, 1);
  assert.match(parsed.stepsMarkdown, /1\. Toast bread\./);
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
