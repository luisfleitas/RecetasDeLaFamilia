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

type RecipeImage = {
  id: number;
  isPrimary: boolean;
  position: number;
};

type Recipe = {
  id: number;
  title: string;
  description: string | null;
  stepsMarkdown: string;
  ingredients: Ingredient[];
  images?: RecipeImage[];
  primaryImage?: { id: number } | null;
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

type ExistingImageDraft = {
  id: number;
};

type UpdateRecipeResponse = {
  recipe?: { id: number };
  error?: string;
};

const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

function toExistingImageDrafts(recipe: Recipe): ExistingImageDraft[] {
  const images = recipe.images ?? [];
  return images.map((image) => ({ id: image.id }));
}

export default function EditRecipeForm({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const [title, setTitle] = useState(recipe.title);
  const [description, setDescription] = useState(recipe.description ?? "");
  const [stepsMarkdown, setStepsMarkdown] = useState(recipe.stepsMarkdown);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(toIngredientDrafts(recipe.ingredients));
  const [existingImages, setExistingImages] = useState<ExistingImageDraft[]>(toExistingImageDrafts(recipe));
  const [newImages, setNewImages] = useState<NewImageDraft[]>([]);
  const [nextImageId, setNextImageId] = useState(1);
  const [primaryExistingImageId, setPrimaryExistingImageId] = useState<number | null>(recipe.primaryImage?.id ?? null);
  const [primaryNewImageId, setPrimaryNewImageId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemovingImageId, setIsRemovingImageId] = useState<number | null>(null);
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

  function totalImageCount() {
    return existingImages.length + newImages.length;
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

  async function removeExistingImage(imageId: number) {
    setError(null);
    setIsRemovingImageId(imageId);

    try {
      const response = await fetch(`/api/recipes/${recipe.id}/images/${imageId}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { promotedPrimaryImageId?: number | null; error?: string };
      if (!response.ok) {
        setError(data.error ?? "Failed to remove image.");
        return;
      }

      setExistingImages((current) => current.filter((image) => image.id !== imageId));
      if (primaryExistingImageId === imageId) {
        setPrimaryExistingImageId(data.promotedPrimaryImageId ?? null);
      }
      router.refresh();
    } catch {
      setError("Failed to remove image.");
    } finally {
      setIsRemovingImageId(null);
    }
  }

  function handleImageSelection(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const selected = Array.from(files);
    const nextTotal = totalImageCount() + selected.length;
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
      if (primaryExistingImageId == null && primaryNewImageId == null && combined.length > 0) {
        setPrimaryNewImageId(combined[0].id);
      }
      return combined;
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

    if (totalImageCount() > MAX_IMAGES) {
      setError(`You can upload up to ${MAX_IMAGES} images.`);
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

    const formData = new FormData();
    formData.append("title", trimmedTitle);
    formData.append("description", description.trim());
    formData.append("stepsMarkdown", trimmedSteps);
    formData.append("ingredients", JSON.stringify(payloadIngredients));

    for (const image of newImages) {
      formData.append("newImages", image.file);
    }

    if (primaryExistingImageId != null) {
      formData.append("primaryImageId", String(primaryExistingImageId));
    } else if (primaryNewImageId != null) {
      const newPrimaryIndex = newImages.findIndex((image) => image.id === primaryNewImageId);
      if (newPrimaryIndex >= 0) {
        formData.append("primaryImageIndex", String(newPrimaryIndex));
      }
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PUT",
        body: formData,
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
    <form id="edit-recipe-form" onSubmit={handleSubmit} className="space-y-4">
      <div id="edit-recipe-title-field">
        <label id="edit-recipe-title-label" htmlFor="title" className="mb-1 block text-sm font-medium">
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

      <div id="edit-recipe-description-field">
        <label id="edit-recipe-description-label" htmlFor="description" className="mb-1 block text-sm font-medium">
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

      <div id="edit-recipe-steps-field">
        <label id="edit-recipe-steps-label" htmlFor="stepsMarkdown" className="mb-1 block text-sm font-medium">
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

      <div id="edit-recipe-images-section" className="surface-card space-y-3 p-4">
        <div id="edit-recipe-images-header" className="mb-1 flex items-center justify-between">
          <p id="edit-recipe-images-title" className="text-sm font-medium">Recipe Images</p>
          <span id="edit-recipe-images-count" className="text-xs text-[var(--color-text-muted)]">{totalImageCount()}/{MAX_IMAGES}</span>
        </div>

        {existingImages.length > 0 ? (
          <ul id="edit-recipe-existing-images-list" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {existingImages.map((image) => (
              <li id={`edit-recipe-existing-image-item-${image.id}`} key={image.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                <img
                  id={`edit-recipe-existing-image-${image.id}`}
                  src={`/api/recipe-images/${image.id}/file?variant=thumb`}
                  alt="Recipe"
                  className="h-36 w-full rounded-[var(--radius-sm)] object-cover"
                />
                <div id={`edit-recipe-existing-image-actions-${image.id}`} className="mt-2 flex items-center gap-2">
                  <label id={`edit-recipe-existing-image-primary-label-${image.id}`} className="text-xs">
                    <input
                      id={`edit-recipe-existing-image-primary-${image.id}`}
                      type="radio"
                      name="primaryImage"
                      checked={primaryExistingImageId === image.id}
                      onChange={() => {
                        setPrimaryExistingImageId(image.id);
                        setPrimaryNewImageId(null);
                      }}
                      className="mr-1"
                    />
                    Principal
                  </label>
                  <button
                    id={`edit-recipe-existing-image-remove-${image.id}`}
                    type="button"
                    onClick={() => removeExistingImage(image.id)}
                    disabled={isRemovingImageId === image.id}
                    className={buttonClassName("secondary")}
                  >
                    {isRemovingImageId === image.id ? "Removing..." : "Remove"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p id="edit-recipe-no-existing-images" className="text-sm text-[var(--color-text-muted)]">No saved images yet.</p>
        )}

        <input
          id="edit-recipe-new-images-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => handleImageSelection(event.target.files)}
          className="input-base"
        />

        {newImages.length > 0 ? (
          <div id="edit-recipe-new-selected-files-box" className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
            <p id="edit-recipe-new-selected-files-title" className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Selected files</p>
            <div id="edit-recipe-new-selected-files-list" className="space-y-1">
              {newImages.map((image) => (
                <p id={`edit-recipe-new-selected-file-${image.id}`} key={image.id} className="truncate text-xs text-[var(--color-text-muted)]">
                  {image.file.name}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {newImages.length > 0 ? (
          <ul id="edit-recipe-new-image-preview-list" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {newImages.map((image) => (
              <li id={`edit-recipe-new-image-preview-item-${image.id}`} key={image.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                <img id={`edit-recipe-new-image-preview-${image.id}`} src={image.previewUrl} alt={image.file.name} className="h-36 w-full rounded-[var(--radius-sm)] object-cover" />
                <p id={`edit-recipe-new-image-name-${image.id}`} className="mt-2 truncate text-xs text-[var(--color-text-muted)]">{image.file.name}</p>
                <div id={`edit-recipe-new-image-actions-${image.id}`} className="mt-2 flex items-center gap-2">
                  <label id={`edit-recipe-new-image-primary-label-${image.id}`} className="text-xs">
                    <input
                      id={`edit-recipe-new-image-primary-${image.id}`}
                      type="radio"
                      name="primaryImage"
                      checked={primaryNewImageId === image.id}
                      onChange={() => {
                        setPrimaryNewImageId(image.id);
                        setPrimaryExistingImageId(null);
                      }}
                      className="mr-1"
                    />
                    Principal
                  </label>
                  <button
                    id={`edit-recipe-new-image-remove-${image.id}`}
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
        ) : null}
      </div>

      <div id="edit-recipe-ingredients-section" className="surface-card p-4">
        <div id="edit-recipe-ingredients-header" className="mb-3 flex items-center justify-between">
          <p id="edit-recipe-ingredients-title" className="text-sm font-medium">Ingredients</p>
          <button id="edit-recipe-add-ingredient" type="button" onClick={addIngredientRow} className={buttonClassName("secondary")}>
            Add Ingredient
          </button>
        </div>

        <div id="edit-recipe-ingredients-list" className="space-y-4">
          {ingredients.map((ingredient, index) => (
            <div id={`edit-recipe-ingredient-row-${ingredient.rowId}`} key={ingredient.rowId} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
              <div id={`edit-recipe-ingredient-row-header-${ingredient.rowId}`} className="mb-2 flex items-center justify-between">
                <p id={`edit-recipe-ingredient-row-title-${ingredient.rowId}`} className="text-sm font-medium">Row {index + 1}</p>
                <button
                  id={`edit-recipe-ingredient-remove-${ingredient.rowId}`}
                  type="button"
                  onClick={() => removeIngredientRow(ingredient.rowId)}
                  disabled={ingredients.length === 1}
                  className={buttonClassName("secondary")}
                >
                  Remove
                </button>
              </div>

              <div id={`edit-recipe-ingredient-fields-${ingredient.rowId}`} className="grid gap-3 sm:grid-cols-2">
                <div id={`edit-recipe-ingredient-name-field-${ingredient.rowId}`} className="sm:col-span-2">
                  <label id={`edit-recipe-ingredient-name-label-${ingredient.rowId}`} htmlFor={`ingredientName-${ingredient.rowId}`} className="mb-1 block text-sm">
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

                <div id={`edit-recipe-ingredient-qty-field-${ingredient.rowId}`}>
                  <label id={`edit-recipe-ingredient-qty-label-${ingredient.rowId}`} htmlFor={`qty-${ingredient.rowId}`} className="mb-1 block text-sm">
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

                <div id={`edit-recipe-ingredient-unit-field-${ingredient.rowId}`}>
                  <label id={`edit-recipe-ingredient-unit-label-${ingredient.rowId}`} htmlFor={`unit-${ingredient.rowId}`} className="mb-1 block text-sm">
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

                <div id={`edit-recipe-ingredient-notes-field-${ingredient.rowId}`}>
                  <label id={`edit-recipe-ingredient-notes-label-${ingredient.rowId}`} htmlFor={`notes-${ingredient.rowId}`} className="mb-1 block text-sm">
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

      {error ? <p id="edit-recipe-error" className="text-sm text-[var(--color-danger)]">{error}</p> : null}

      <button id="edit-recipe-submit" type="submit" disabled={isSubmitting} className={buttonClassName("primary")}>
        {isSubmitting ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
