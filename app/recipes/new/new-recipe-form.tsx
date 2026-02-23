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

type NewImageDraft = {
  id: number;
  file: File;
  previewUrl: string;
};

const EMPTY_INGREDIENT: IngredientDraft = {
  rowId: 1,
  name: "",
  qty: "",
  unit: "",
  notes: "",
};

const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function NewRecipeForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([EMPTY_INGREDIENT]);
  const [newImages, setNewImages] = useState<NewImageDraft[]>([]);
  const [nextImageId, setNextImageId] = useState(1);
  const [primaryNewImageId, setPrimaryNewImageId] = useState<number | null>(null);

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

  function removeNewImage(imageId: number) {
    setNewImages((current) => {
      const image = current.find((item) => item.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }

      const next = current.filter((item) => item.id !== imageId);
      if (primaryNewImageId === imageId) {
        setPrimaryNewImageId(next[0]?.id ?? null);
      }

      return next;
    });
  }

  function handleImageSelection(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const selected = Array.from(files);
    const nextTotal = newImages.length + selected.length;
    if (nextTotal > MAX_IMAGES) {
      setError(`You can upload up to ${MAX_IMAGES} images.`);
      return;
    }

    for (const file of selected) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        setError("Only JPEG, PNG, and WEBP images are allowed.");
        return;
      }

      if (file.size > MAX_IMAGE_BYTES) {
        setError("Each image must be 10MB or smaller.");
        return;
      }
    }

    setError(null);

    const drafted = selected.map((file, index): NewImageDraft => ({
      id: nextImageId + index,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setNextImageId((current) => current + drafted.length);
    setNewImages((current) => {
      const combined = [...current, ...drafted];
      if (primaryNewImageId == null && combined.length > 0) {
        setPrimaryNewImageId(combined[0].id);
      }
      return combined;
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

    if (newImages.length > MAX_IMAGES) {
      setError(`You can upload up to ${MAX_IMAGES} images.`);
      setIsSubmitting(false);
      return;
    }

    const recipeFormData = new FormData();
    recipeFormData.append("title", title);
    recipeFormData.append("description", description);
    recipeFormData.append("stepsMarkdown", stepsMarkdown);
    recipeFormData.append("ingredients", JSON.stringify(payloadIngredients));

    for (const image of newImages) {
      recipeFormData.append("images", image.file);
    }

    if (primaryNewImageId != null) {
      const primaryIndex = newImages.findIndex((image) => image.id === primaryNewImageId);
      if (primaryIndex >= 0) {
        recipeFormData.append("primaryImageIndex", String(primaryIndex));
      }
    }

    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        body: recipeFormData,
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
              <p className="text-sm font-medium">Recipe Images</p>
              <span className="text-xs text-[var(--color-text-muted)]">{newImages.length}/{MAX_IMAGES}</span>
            </div>

            <div className="space-y-3">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => handleImageSelection(event.target.files)}
                className="input-base"
              />

              {newImages.length > 0 ? (
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                  <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Selected files</p>
                  <div className="space-y-1">
                    {newImages.map((image) => (
                      <p key={image.id} className="truncate text-xs text-[var(--color-text-muted)]">
                        {image.file.name}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              {newImages.length > 0 ? (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {newImages.map((image) => (
                    <li key={image.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                      <img src={image.previewUrl} alt={image.file.name} className="h-36 w-full rounded-[var(--radius-sm)] object-cover" />
                      <p className="mt-2 truncate text-xs text-[var(--color-text-muted)]">{image.file.name}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-xs">
                          <input
                            type="radio"
                            name="primaryNewImage"
                            checked={primaryNewImageId === image.id}
                            onChange={() => setPrimaryNewImageId(image.id)}
                            className="mr-1"
                          />
                          Principal
                        </label>
                        <button
                          type="button"
                          onClick={() => removeNewImage(image.id)}
                          className={buttonClassName("secondary")}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">No images selected yet.</p>
              )}
            </div>
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
