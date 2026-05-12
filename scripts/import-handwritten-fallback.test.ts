import assert from "node:assert/strict";
import { test } from "node:test";
import { buildHandwrittenFallbackDraft } from "../lib/application/recipes/handwritten-import";

test("handwritten fallback extracts plain quantity ingredients from OCR text", () => {
  const draft = buildHandwrittenFallbackDraft(`
Page 1
Ensalada de Navidad
1 caja de agua
1 cucharadita royal
2 cucharadas de cacao
1 cucharada de cafe instantaneo
1 taza de harina de trigo
5 huevos
1/2 taza de azucar
Relleno
6 cucharadas de mantequilla sin sal
3 cucharadas de leche liquida
3 cucharadas de cacao en polvo
3 1/4 cucharadas de nevazucar
Preparacion
Se baten las claras a punto de suspiro.
Se le agrega el azucar.
Se hornea por 20 a 30 minutos.
`);

  assert.equal(draft.title, "Ensalada de Navidad");
  assert.equal(draft.ingredients.length, 11);
  assert.deepEqual(
    draft.ingredients.slice(0, 3).map((ingredient) => ({
      qty: ingredient.qty,
      unit: ingredient.unit.toLowerCase(),
      name: ingredient.name.toLowerCase(),
    })),
    [
      { qty: 1, unit: "unit", name: "caja de agua" },
      { qty: 1, unit: "cucharadita", name: "royal" },
      { qty: 2, unit: "cucharada", name: "cacao" },
    ],
  );
  assert.match(draft.stepsMarkdown, /1\. Se baten las claras/);
});
