"use client";
// Client page for creating a recipe and ingredient rows.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import { IngredientEditor } from "@/app/recipes/_components/ingredient-editor";
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

type FamilyOption = {
  id: number;
  name: string;
};

type NewRecipeFormProps = {
  isRecipeImportEnabled: boolean;
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

export default function NewRecipeForm({ isRecipeImportEnabled }: NewRecipeFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const importSessionId = searchParams.get("importSession");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stepsMarkdown, setStepsMarkdown] = useState("");
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([EMPTY_INGREDIENT]);
  const [newImages, setNewImages] = useState<NewImageDraft[]>([]);
  const [nextImageId, setNextImageId] = useState(1);
  const [primaryNewImageId, setPrimaryNewImageId] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<"public" | "private" | "family">("public");
  const [familyOptions, setFamilyOptions] = useState<FamilyOption[]>([]);
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<number[]>([]);

  useEffect(() => {
    async function loadFamilies() {
      try {
        const response = await fetch("/api/families", { cache: "no-store" });
        const data = (await response.json()) as {
          families?: Array<{ id: number; name: string }>;
          error?: string;
        };

        if (!response.ok || !data.families) {
          return;
        }

        setFamilyOptions(data.families.map((family) => ({ id: family.id, name: family.name })));
      } catch {
        // Leave family options empty if fetch fails.
      }
    }

    loadFamilies();
  }, []);

  useEffect(() => {
    if (!importSessionId) {
      return;
    }

    let isCancelled = false;

    const hydrateFromImportSession = async () => {
      try {
        const response = await fetch(`/api/recipes/import/sessions/${encodeURIComponent(importSessionId)}`, {
          method: "GET",
        });
        const data = (await response.json()) as { draft?: ImportedRecipeDraft; error?: string };
        if (!response.ok || !data.draft) {
          if (!isCancelled) {
            setError(data.error ?? "Could not hydrate imported draft.");
          }
          return;
        }

        if (!isCancelled) {
          setTitle(data.draft.title ?? "");
          setDescription(data.draft.description ?? "");
          setStepsMarkdown(data.draft.stepsMarkdown ?? "");
          setIngredients(toIngredientDraftsFromImportedDraft(data.draft));
          setError(null);
        }
      } catch {
        if (!isCancelled) {
          setError("Could not hydrate imported draft.");
        }
      }
    };

    void hydrateFromImportSession();

    return () => {
      isCancelled = true;
    };
  }, [importSessionId]);

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

  function toggleSelectedFamily(familyId: number) {
    setSelectedFamilyIds((current) =>
      current.includes(familyId) ? current.filter((id) => id !== familyId) : [...current, familyId],
    );
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

    if (visibility === "family" && selectedFamilyIds.length === 0) {
      setError("Choose at least one family when sharing is set to Family.");
      setIsSubmitting(false);
      return;
    }

    const recipeFormData = new FormData();
    recipeFormData.append("title", trimmedTitle);
    recipeFormData.append("description", trimmedDescription);
    recipeFormData.append("stepsMarkdown", trimmedStepsMarkdown);
    recipeFormData.append("visibility", visibility);
    recipeFormData.append("ingredients", JSON.stringify(payloadIngredients));

    if (visibility === "family") {
      for (const familyId of selectedFamilyIds) {
        recipeFormData.append("familyIds", String(familyId));
      }
    }

    for (const image of newImages) {
      recipeFormData.append("images", image.file);
    }

    if (primaryNewImageId != null) {
      const primaryIndex = newImages.findIndex((image) => image.id === primaryNewImageId);
      if (primaryIndex >= 0) {
        recipeFormData.append("primaryImageIndex", String(primaryIndex));
      }
    }

    if (importSessionId) {
      recipeFormData.append("importSessionId", importSessionId);
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
            {isRecipeImportEnabled ? (
              <Link id="new-recipe-import-link" href="/recipes/import" className="text-link text-sm">
                Import Recipe
              </Link>
            ) : null}
            <Link id="new-recipe-back-link" href="/" className="text-link text-sm">
              Back to list
            </Link>
          </div>
        </div>

        <form id="new-recipe-form" onSubmit={handleSubmit} className="space-y-4">
          <div id="new-recipe-basic-info-section" className="surface-card recipe-form-section p-4">
            <div id="new-recipe-basic-info-header" className="recipe-form-section-header">
              <div id="new-recipe-basic-info-copy" className="recipe-form-section-copy">
                <p id="new-recipe-basic-info-title" className="recipe-form-section-title">Basic info</p>
                <p id="new-recipe-basic-info-description" className="recipe-form-section-description">
                  Start with the core details before building the ingredient list.
                </p>
              </div>
            </div>

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
          </div>

          <div id="new-recipe-sharing-section" className="surface-card recipe-form-section p-4">
            <div id="new-recipe-sharing-header" className="recipe-form-section-header">
              <div id="new-recipe-sharing-copy" className="recipe-form-section-copy">
                <p id="new-recipe-sharing-title" className="recipe-form-section-title">Sharing</p>
                <p id="new-recipe-sharing-description" className="recipe-form-section-description">
                  Choose whether this recipe is public, private, or shared with one or more families.
                </p>
              </div>
            </div>

            <div id="new-recipe-sharing-visibility-group" className="flex flex-wrap gap-4">
              <label id="new-recipe-sharing-public-label" className="text-sm">
                <input
                  id="new-recipe-sharing-public-input"
                  type="radio"
                  name="recipeVisibility"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                  className="mr-2"
                />
                Public (everyone)
              </label>
              <label id="new-recipe-sharing-private-label" className="text-sm">
                <input
                  id="new-recipe-sharing-private-input"
                  type="radio"
                  name="recipeVisibility"
                  checked={visibility === "private"}
                  onChange={() => setVisibility("private")}
                  className="mr-2"
                />
                Private (only you)
              </label>
              <label id="new-recipe-sharing-family-label" className="text-sm">
                <input
                  id="new-recipe-sharing-family-input"
                  type="radio"
                  name="recipeVisibility"
                  checked={visibility === "family"}
                  onChange={() => setVisibility("family")}
                  className="mr-2"
                />
                Family
              </label>
            </div>

            {visibility === "family" ? (
              <div id="new-recipe-sharing-families-section" className="space-y-2">
                <p id="new-recipe-sharing-families-title" className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                  Select families
                </p>
                {familyOptions.length > 0 ? (
                  <ul id="new-recipe-sharing-families-list" className="space-y-2">
                    {familyOptions.map((family) => (
                      <li id={`new-recipe-sharing-family-item-${family.id}`} key={family.id}>
                        <label id={`new-recipe-sharing-family-label-${family.id}`} className="text-sm">
                          <input
                            id={`new-recipe-sharing-family-input-${family.id}`}
                            type="checkbox"
                            checked={selectedFamilyIds.includes(family.id)}
                            onChange={() => toggleSelectedFamily(family.id)}
                            className="mr-2"
                          />
                          {family.name}
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p id="new-recipe-sharing-families-empty" className="text-sm text-[var(--color-text-muted)]">
                    You are not a member of any families yet.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <IngredientEditor
            addButtonId="new-recipe-add-ingredient"
            baseId="new-recipe-ingredients"
            ingredients={ingredients}
            onAdd={addIngredientRow}
            onRemove={removeIngredientRow}
            onUpdate={updateIngredient}
            title="Ingredients"
          />

          <div id="new-recipe-images-section" className="surface-card recipe-form-section p-4">
            <div id="new-recipe-images-header" className="mb-3 flex items-center justify-between">
              <div id="new-recipe-images-copy" className="recipe-form-section-copy">
                <p id="new-recipe-images-title" className="recipe-form-section-title">Recipe Images</p>
                <p id="new-recipe-images-description" className="recipe-form-section-description">
                  Add photos after the ingredients are in place, then choose the primary image.
                </p>
              </div>
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

          <div id="new-recipe-steps-section" className="surface-card recipe-form-section p-4">
            <div id="new-recipe-steps-header" className="recipe-form-section-header">
              <div id="new-recipe-steps-copy" className="recipe-form-section-copy">
                <p id="new-recipe-steps-title" className="recipe-form-section-title">Steps</p>
                <p id="new-recipe-steps-description" className="recipe-form-section-description">
                  Write the instructions last, after the recipe structure and ingredients are in place.
                </p>
              </div>
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
