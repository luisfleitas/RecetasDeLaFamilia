"use client";
// Client page for creating a recipe and ingredient rows.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import type { ImportedRecipeDraft } from "@/lib/application/recipes/text-document-import";

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
const IMPORT_DRAFT_STORAGE_KEY = "recipe-import-draft-v1";

function toIngredientDraftsFromImportedDraft(draft: ImportedRecipeDraft): IngredientDraft[] {
  if (draft.ingredients.length === 0) {
    return [EMPTY_INGREDIENT];
  }

  return draft.ingredients.map((ingredient, index) => ({
    rowId: index + 1,
    name: ingredient.name,
    qty: ingredient.qty.toString(),
    unit: ingredient.unit,
    notes: ingredient.notes ?? "",
  }));
}

export default function NewRecipeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stepsMarkdown, setStepsMarkdown] = useState("");
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([EMPTY_INGREDIENT]);
  const [newImages, setNewImages] = useState<NewImageDraft[]>([]);
  const [nextImageId, setNextImageId] = useState(1);
  const [primaryNewImageId, setPrimaryNewImageId] = useState<number | null>(null);

  useEffect(() => {
    if (searchParams.get("importDraft") !== "1") {
      return;
    }

    const stored = window.sessionStorage.getItem(IMPORT_DRAFT_STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as ImportedRecipeDraft;
      setTitle(parsed.title ?? "");
      setDescription(parsed.description ?? "");
      setStepsMarkdown(parsed.stepsMarkdown ?? "");
      setIngredients(toIngredientDraftsFromImportedDraft(parsed));
      setError(null);
      window.sessionStorage.removeItem(IMPORT_DRAFT_STORAGE_KEY);
    } catch {
      setError("Could not hydrate imported draft.");
    }
  }, [searchParams]);

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

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedStepsMarkdown = stepsMarkdown.trim();

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

    if (!trimmedTitle) {
      setError("Title is required.");
      setIsSubmitting(false);
      return;
    }

    if (!trimmedStepsMarkdown) {
      setError("Steps are required.");
      setIsSubmitting(false);
      return;
    }

    const recipeFormData = new FormData();
    recipeFormData.append("title", trimmedTitle);
    recipeFormData.append("description", trimmedDescription);
    recipeFormData.append("stepsMarkdown", trimmedStepsMarkdown);
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
    <main id="new-recipe-main" className="app-shell max-w-5xl">
      <div id="new-recipe-panel" className="surface-panel space-y-6 p-6 sm:p-8">
        <div id="new-recipe-header" className="flex items-center justify-between">
          <h1 id="new-recipe-title" className="text-2xl font-semibold">Add Family Recipe</h1>
          <div id="new-recipe-header-links" className="flex items-center gap-3">
            <Link id="new-recipe-import-link" href="/recipes/import" className="text-link text-sm">
              Import text
            </Link>
            <Link id="new-recipe-back-link" href="/" className="text-link text-sm">
              Back to list
            </Link>
          </div>
        </div>

        <form id="new-recipe-form" onSubmit={handleSubmit} className="space-y-4">
          <div id="new-recipe-title-field">
            <label id="new-recipe-title-label" htmlFor="title" className="mb-1 block text-sm font-medium">
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

          <div id="new-recipe-description-field">
            <label id="new-recipe-description-label" htmlFor="description" className="mb-1 block text-sm font-medium">
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

          <div id="new-recipe-steps-field">
            <label id="new-recipe-steps-label" htmlFor="stepsMarkdown" className="mb-1 block text-sm font-medium">
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

          <div id="new-recipe-images-section" className="surface-card p-4">
            <div id="new-recipe-images-header" className="mb-3 flex items-center justify-between">
              <p id="new-recipe-images-title" className="text-sm font-medium">Recipe Images</p>
              <span id="new-recipe-images-count" className="text-xs text-[var(--color-text-muted)]">{newImages.length}/{MAX_IMAGES}</span>
            </div>

            <div id="new-recipe-images-content" className="space-y-3">
              <input
                id="new-recipe-images-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => handleImageSelection(event.target.files)}
                className="input-base"
              />

              {newImages.length > 0 ? (
                <div id="new-recipe-selected-files-box" className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                  <p id="new-recipe-selected-files-title" className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Selected files</p>
                  <div id="new-recipe-selected-files-list" className="space-y-1">
                    {newImages.map((image) => (
                      <p id={`new-recipe-selected-file-${image.id}`} key={image.id} className="truncate text-xs text-[var(--color-text-muted)]">
                        {image.file.name}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              {newImages.length > 0 ? (
                <ul id="new-recipe-image-preview-list" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {newImages.map((image) => (
                    <li id={`new-recipe-image-preview-item-${image.id}`} key={image.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                      <img id={`new-recipe-image-preview-${image.id}`} src={image.previewUrl} alt={image.file.name} className="h-36 w-full rounded-[var(--radius-sm)] object-cover" />
                      <p id={`new-recipe-image-name-${image.id}`} className="mt-2 truncate text-xs text-[var(--color-text-muted)]">{image.file.name}</p>
                      <div id={`new-recipe-image-actions-${image.id}`} className="mt-2 flex items-center gap-2">
                        <label id={`new-recipe-image-primary-label-${image.id}`} className="text-xs">
                          <input
                            id={`new-recipe-image-primary-${image.id}`}
                            type="radio"
                            name="primaryNewImage"
                            checked={primaryNewImageId === image.id}
                            onChange={() => setPrimaryNewImageId(image.id)}
                            className="mr-1"
                          />
                          Principal
                        </label>
                        <button
                          id={`new-recipe-image-remove-${image.id}`}
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
                <p id="new-recipe-no-images" className="text-sm text-[var(--color-text-muted)]">No images selected yet.</p>
              )}
            </div>
          </div>

          <div id="new-recipe-ingredients-section" className="surface-card p-4">
            <div id="new-recipe-ingredients-header" className="mb-3 flex items-center justify-between">
              <p id="new-recipe-ingredients-title" className="text-sm font-medium">Ingredients</p>
              <button id="new-recipe-add-ingredient" type="button" onClick={addIngredientRow} className={buttonClassName("secondary")}>
                Add Ingredient
              </button>
            </div>

            <div id="new-recipe-ingredients-list" className="space-y-4">
              {ingredients.map((ingredient, index) => (
                <div id={`new-recipe-ingredient-row-${ingredient.rowId}`} key={ingredient.rowId} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                  <div id={`new-recipe-ingredient-row-header-${ingredient.rowId}`} className="mb-2 flex items-center justify-between">
                    <p id={`new-recipe-ingredient-row-title-${ingredient.rowId}`} className="text-sm font-medium">Row {index + 1}</p>
                    <button
                      id={`new-recipe-ingredient-remove-${ingredient.rowId}`}
                      type="button"
                      onClick={() => removeIngredientRow(ingredient.rowId)}
                      disabled={ingredients.length === 1}
                      className={buttonClassName("secondary")}
                    >
                      Remove
                    </button>
                  </div>

                  <div id={`new-recipe-ingredient-fields-${ingredient.rowId}`} className="grid gap-3 sm:grid-cols-2">
                    <div id={`new-recipe-ingredient-name-field-${ingredient.rowId}`} className="sm:col-span-2">
                      <label id={`new-recipe-ingredient-name-label-${ingredient.rowId}`} htmlFor={`ingredientName-${ingredient.rowId}`} className="mb-1 block text-sm">
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

                    <div id={`new-recipe-ingredient-qty-field-${ingredient.rowId}`}>
                      <label id={`new-recipe-ingredient-qty-label-${ingredient.rowId}`} htmlFor={`qty-${ingredient.rowId}`} className="mb-1 block text-sm">
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

                    <div id={`new-recipe-ingredient-unit-field-${ingredient.rowId}`}>
                      <label id={`new-recipe-ingredient-unit-label-${ingredient.rowId}`} htmlFor={`unit-${ingredient.rowId}`} className="mb-1 block text-sm">
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

                    <div id={`new-recipe-ingredient-notes-field-${ingredient.rowId}`}>
                      <label id={`new-recipe-ingredient-notes-label-${ingredient.rowId}`} htmlFor={`notes-${ingredient.rowId}`} className="mb-1 block text-sm">
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

          {error ? <p id="new-recipe-error" className="text-sm text-[var(--color-danger)]">{error}</p> : null}

          <button id="new-recipe-submit" type="submit" disabled={isSubmitting} className={buttonClassName("primary")}>
            {isSubmitting ? "Creating..." : "Create Recipe"}
          </button>
        </form>
      </div>
    </main>
  );
}
