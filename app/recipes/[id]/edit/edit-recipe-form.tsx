"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClassName } from "@/app/_components/ui/button-styles";

type Ingredient = {
  id: number;
  name: string;
  qty: number;
  unit: string;
  notes: string | null;
  position: number;
};

type Recipe = {
  id: number;
  title: string;
  description: string | null;
  stepsMarkdown: string;
  ingredients: Ingredient[];
};

type IngredientDraft = {
  rowId: number;
  name: string;
  qty: string;
  unit: string;
  notes: string;
};

type UpdateRecipeResponse = {
  recipe?: { id: number };
  error?: string;
};

function toIngredientDrafts(ingredients: Ingredient[]): IngredientDraft[] {
  if (ingredients.length === 0) {
    return [{ rowId: 1, name: "", qty: "", unit: "", notes: "" }];
  }

  return ingredients.map((ingredient, index) => ({
    rowId: index + 1,
    name: ingredient.name,
    qty: ingredient.qty.toString(),
    unit: ingredient.unit,
    notes: ingredient.notes ?? "",
  }));
}

export default function EditRecipeForm({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const [title, setTitle] = useState(recipe.title);
  const [description, setDescription] = useState(recipe.description ?? "");
  const [stepsMarkdown, setStepsMarkdown] = useState(recipe.stepsMarkdown);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(toIngredientDrafts(recipe.ingredients));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateIngredient(rowId: number, field: keyof Omit<IngredientDraft, "rowId">, value: string) {
    setIngredients((current) =>
      current.map((ingredient) => (ingredient.rowId === rowId ? { ...ingredient, [field]: value } : ingredient)),
    );
  }

  function addIngredientRow() {
    setIngredients((current) => {
      const maxRowId = current.reduce((max, ingredient) => Math.max(max, ingredient.rowId), 0);
      return [...current, { rowId: maxRowId + 1, name: "", qty: "", unit: "", notes: "" }];
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

    const trimmedTitle = title.trim();
    const trimmedSteps = stepsMarkdown.trim();

    if (trimmedTitle.length === 0) {
      setError("Title is required.");
      return;
    }

    if (trimmedSteps.length === 0) {
      setError("Steps are required.");
      return;
    }

    if (ingredients.length === 0) {
      setError("Add at least one ingredient.");
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
      return;
    }

    const payload = {
      title: trimmedTitle,
      description: description.trim(),
      stepsMarkdown: trimmedSteps,
      ingredients: payloadIngredients,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as UpdateRecipeResponse;

      if (!response.ok || !data.recipe) {
        setError(data.error ?? "Failed to update recipe");
        return;
      }

      router.push(`/recipes/${data.recipe.id}`);
      router.refresh();
    } catch {
      setError("Failed to update recipe");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="input-base"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="input-base"
        />
      </div>

      <div>
        <label htmlFor="stepsMarkdown" className="mb-1 block text-sm font-medium">
          Steps (Markdown)
        </label>
        <textarea
          id="stepsMarkdown"
          name="stepsMarkdown"
          rows={6}
          required
          value={stepsMarkdown}
          onChange={(event) => setStepsMarkdown(event.target.value)}
          className="input-base"
        />
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
        {isSubmitting ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
