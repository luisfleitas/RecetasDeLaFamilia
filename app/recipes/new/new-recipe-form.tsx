"use client";
// Client page for creating a recipe and ingredient rows.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { buttonClassName } from "@/app/_components/ui/button-styles";

type CreatedRecipe = {
  id: number;
};

type CreateRecipeResponse = {
  recipe?: CreatedRecipe;
  error?: string;
};

type IngredientDraft = {
  rowId: number;
  name: string;
  qty: string;
  unit: string;
  notes: string;
};

const EMPTY_INGREDIENT: IngredientDraft = {
  rowId: 1,
  name: "",
  qty: "",
  unit: "",
  notes: "",
};

export default function NewRecipeForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([EMPTY_INGREDIENT]);

  function updateIngredient(rowId: number, field: keyof Omit<IngredientDraft, "rowId">, value: string) {
    setIngredients((current) =>
      current.map((ingredient) =>
        ingredient.rowId === rowId ? { ...ingredient, [field]: value } : ingredient,
      ),
    );
  }

  function addIngredientRow() {
    setIngredients((current) => {
      const maxRowId = current.reduce((max, ingredient) => Math.max(max, ingredient.rowId), 0);
      return [
        ...current,
        {
          rowId: maxRowId + 1,
          name: "",
          qty: "",
          unit: "",
          notes: "",
        },
      ];
    });
  }

  function removeIngredientRow(rowId: number) {
    setIngredients((current) => {
      if (current.length === 1) {
        return current;
      }
      return current.filter((ingredient) => ingredient.rowId !== rowId);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const stepsMarkdown = String(formData.get("stepsMarkdown") ?? "").trim();

    if (ingredients.length === 0) {
      setError("Add at least one ingredient.");
      setIsSubmitting(false);
      return;
    }

    const payloadIngredients = ingredients.map((ingredient, index) => ({
      name: ingredient.name.trim(),
      qty: Number(ingredient.qty),
      unit: ingredient.unit.trim(),
      notes: ingredient.notes.trim(),
      position: index + 1,
    }));

    const hasInvalidIngredient = payloadIngredients.some(
      (ingredient) =>
        ingredient.name.length === 0 ||
        ingredient.unit.length === 0 ||
        !Number.isFinite(ingredient.qty) ||
        ingredient.qty <= 0 ||
        ingredient.position < 1,
    );

    if (hasInvalidIngredient) {
      setError("Check ingredients: qty must be a positive decimal number and required fields must be filled.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      title,
      description,
      stepsMarkdown,
      ingredients: payloadIngredients,
    };

    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as CreateRecipeResponse;

      if (!response.ok || !data.recipe) {
        setError(data.error ?? "Failed to create recipe");
        return;
      }

      router.push(`/recipes/${data.recipe.id}`);
    } catch {
      setError("Failed to create recipe");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell max-w-5xl">
      <div className="surface-panel space-y-6 p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Add Family Recipe</h1>
          <Link href="/" className="text-link text-sm">
            Back to list
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium">
              Title
            </label>
            <input id="title" name="title" required className="input-base" />
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium">
              Description
            </label>
            <textarea id="description" name="description" rows={2} className="input-base" />
          </div>

          <div>
            <label htmlFor="stepsMarkdown" className="mb-1 block text-sm font-medium">
              Steps (Markdown)
            </label>
            <textarea id="stepsMarkdown" name="stepsMarkdown" rows={6} required className="input-base" />
          </div>

          <div className="surface-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Ingredients</p>
              <button type="button" onClick={addIngredientRow} className={buttonClassName("secondary")}>
                Add Ingredient
              </button>
            </div>

            <div className="space-y-4">
              {ingredients.map((ingredient, index) => (
                <div key={ingredient.rowId} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">Row {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeIngredientRow(ingredient.rowId)}
                      disabled={ingredients.length === 1}
                      className={buttonClassName("secondary")}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label htmlFor={`ingredientName-${ingredient.rowId}`} className="mb-1 block text-sm">
                        Name
                      </label>
                      <input
                        id={`ingredientName-${ingredient.rowId}`}
                        required
                        value={ingredient.name}
                        onChange={(event) => updateIngredient(ingredient.rowId, "name", event.target.value)}
                        className="input-base"
                      />
                    </div>

                    <div>
                      <label htmlFor={`qty-${ingredient.rowId}`} className="mb-1 block text-sm">
                        Quantity
                      </label>
                      <input
                        id={`qty-${ingredient.rowId}`}
                        type="number"
                        min={0.001}
                        step={0.001}
                        required
                        value={ingredient.qty}
                        onChange={(event) => updateIngredient(ingredient.rowId, "qty", event.target.value)}
                        className="input-base"
                      />
                    </div>

                    <div>
                      <label htmlFor={`unit-${ingredient.rowId}`} className="mb-1 block text-sm">
                        Unit
                      </label>
                      <input
                        id={`unit-${ingredient.rowId}`}
                        required
                        value={ingredient.unit}
                        onChange={(event) => updateIngredient(ingredient.rowId, "unit", event.target.value)}
                        className="input-base"
                      />
                    </div>

                    <div>
                      <label htmlFor={`notes-${ingredient.rowId}`} className="mb-1 block text-sm">
                        Notes
                      </label>
                      <input
                        id={`notes-${ingredient.rowId}`}
                        value={ingredient.notes}
                        onChange={(event) => updateIngredient(ingredient.rowId, "notes", event.target.value)}
                        className="input-base"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}

          <button type="submit" disabled={isSubmitting} className={buttonClassName("primary")}>
            {isSubmitting ? "Creating..." : "Create Recipe"}
          </button>
        </form>
      </div>
    </main>
  );
}
