"use client";
// Client page for creating a recipe and ingredient rows.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { RecipeDetailsForm, type RecipeDetailsFamilyOption } from "@/app/recipes/_components/recipe-details-form";
import { useMessages } from "@/app/_components/locale-provider";
import { RECIPE_IMAGE_MAX_UPLOAD_BYTES } from "@/lib/application/recipes/image-upload-constraints";
import {
  buildCreateRecipeDetailsPayload,
  createEmptyRecipeDetailsDraft,
  hydrateRecipeDetailsDraftFromImport,
  type RecipeDetailsImageDraft,
  type RecipeDetailsIngredientDraft,
  type RecipeDetailsVisibility,
} from "@/lib/application/recipes/recipe-details-draft";
import type { ImportedRecipeDraft } from "@/lib/application/recipes/text-document-import";
import type { RecipeLanguage } from "@/lib/domain/recipe-language";

type CreatedRecipe = {
  id: number;
};

type CreateRecipeResponse = {
  recipe?: CreatedRecipe;
  error?: string;
};

type UploadRecipeImageResponse = {
  recipe?: CreatedRecipe;
  error?: string;
};

type NewRecipeFormProps = {
  isRecipeImportEnabled: boolean;
};

const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = RECIPE_IMAGE_MAX_UPLOAD_BYTES;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function NewRecipeForm({ isRecipeImportEnabled }: NewRecipeFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const messages = useMessages();
  const importSessionId = searchParams.get("importSession");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emptyDraft = createEmptyRecipeDetailsDraft();
  const [title, setTitle] = useState(emptyDraft.title);
  const [description, setDescription] = useState(emptyDraft.description);
  const [stepsMarkdown, setStepsMarkdown] = useState(emptyDraft.stepsMarkdown);
  const [recipeLanguage, setRecipeLanguage] = useState<RecipeLanguage>(emptyDraft.language);
  const [ingredients, setIngredients] = useState<RecipeDetailsIngredientDraft[]>(emptyDraft.ingredients);
  const [newImages, setNewImages] = useState<RecipeDetailsImageDraft[]>(emptyDraft.newImages);
  const [nextImageId, setNextImageId] = useState(1);
  const [primaryNewImageId, setPrimaryNewImageId] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<RecipeDetailsVisibility>(emptyDraft.visibility);
  const [familyOptions, setFamilyOptions] = useState<RecipeDetailsFamilyOption[]>([]);
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<number[]>(emptyDraft.selectedFamilyIds);

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
            setError(data.error ?? messages.recipe.errors.hydrateImportDraft);
          }
          return;
        }

        if (!isCancelled) {
          const hydratedDraft = hydrateRecipeDetailsDraftFromImport(data.draft, importSessionId);
          setTitle(hydratedDraft.title);
          setDescription(hydratedDraft.description);
          setStepsMarkdown(hydratedDraft.stepsMarkdown);
          setRecipeLanguage(hydratedDraft.language);
          setIngredients(hydratedDraft.ingredients);
          setError(null);
        }
      } catch {
        if (!isCancelled) {
          setError(messages.recipe.errors.hydrateImportDraft);
        }
      }
    };

    void hydrateFromImportSession();

    return () => {
      isCancelled = true;
    };
  }, [importSessionId, messages.recipe.errors.hydrateImportDraft]);

  function updateIngredient(rowId: number, field: keyof Omit<RecipeDetailsIngredientDraft, "rowId">, value: string) {
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
      setError(messages.recipe.errors.maxImages);
      return;
    }

    for (const file of selected) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        setError(messages.recipe.errors.invalidImageType);
        return;
      }

      if (file.size > MAX_IMAGE_BYTES) {
        setError(messages.recipe.errors.invalidImageSize);
        return;
      }
    }

    setError(null);

    const drafted = selected.map((file, index): RecipeDetailsImageDraft => ({
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

  function getRecipeDetailsValidationMessage(code: string) {
    switch (code) {
      case "REQUIRED_TITLE":
        return messages.recipe.errors.requiredTitle;
      case "REQUIRED_STEPS":
        return messages.recipe.errors.requiredSteps;
      case "MISSING_INGREDIENT":
        return messages.recipe.errors.missingIngredient;
      case "FAMILY_SELECTION_REQUIRED":
        return messages.recipe.errors.familySelectionRequired;
      case "PRIMARY_IMAGE_NOT_FOUND":
        return messages.recipe.errors.createRecipeFailed;
      case "INVALID_INGREDIENT":
      default:
        return messages.recipe.errors.invalidIngredient;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (newImages.length > MAX_IMAGES) {
      setError(messages.recipe.errors.maxImages);
      setIsSubmitting(false);
      return;
    }

    const draftResult = buildCreateRecipeDetailsPayload({
      title,
      description,
      stepsMarkdown,
      language: recipeLanguage,
      ingredients,
      newImages,
      primaryNewImageId,
      visibility,
      selectedFamilyIds,
      importSessionId,
      isImportComplete: Boolean(importSessionId),
      importSourceRefs: [],
      importMetadata: null,
      primarySourceDocumentId: null,
    });

    if (!draftResult.ok) {
      setError(getRecipeDetailsValidationMessage(draftResult.errors[0]?.code ?? "INVALID_INGREDIENT"));
      setIsSubmitting(false);
      return;
    }

    const recipeFormData = new FormData();
    recipeFormData.append("title", draftResult.payload.title);
    recipeFormData.append("description", draftResult.payload.description);
    recipeFormData.append("stepsMarkdown", draftResult.payload.stepsMarkdown);
    recipeFormData.append("language", draftResult.payload.language);
    recipeFormData.append("visibility", draftResult.payload.visibility);
    recipeFormData.append("ingredients", JSON.stringify(draftResult.payload.ingredients));

    if (draftResult.payload.visibility === "family") {
      for (const familyId of draftResult.payload.familyIds) {
        recipeFormData.append("familyIds", String(familyId));
      }
    }

    if (draftResult.payload.importSessionId) {
      recipeFormData.append("importSessionId", draftResult.payload.importSessionId);
    }
    if (draftResult.payload.primaryMediaReference) {
      recipeFormData.append(
        "primaryMediaReference",
        `${draftResult.payload.primaryMediaReference.type}:${draftResult.payload.primaryMediaReference.id}`,
      );
    }

    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        body: recipeFormData,
      });

      const data = (await response.json()) as CreateRecipeResponse;

      if (!response.ok || !data.recipe) {
        setError(data.error ?? messages.recipe.errors.createRecipeFailed);
        return;
      }

      for (const image of draftResult.imageUploads) {
        const imageFormData = new FormData();
        imageFormData.append("image", image.file);
        if (image.makePrimary) {
          imageFormData.append("makePrimary", "true");
        }

        const imageResponse = await fetch(`/api/recipes/${data.recipe.id}/images`, {
          method: "POST",
          body: imageFormData,
        });
        const imageData = (await imageResponse.json()) as UploadRecipeImageResponse;

        if (!imageResponse.ok || !imageData.recipe) {
          setError(imageData.error ?? messages.recipe.errors.createRecipeFailed);
          return;
        }
      }

      router.push(`/recipes/${data.recipe.id}`);
    } catch {
      setError(messages.recipe.errors.createRecipeFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="new-recipe-main" className="max-w-5xl">
      <div id="new-recipe-panel" className="surface-panel space-y-6 p-6 sm:p-8">
        <div id="new-recipe-header" className="flex items-center justify-between gap-3">
          <h1 id="new-recipe-title" className="text-2xl font-semibold">{messages.recipe.newTitle}</h1>
          <div id="new-recipe-header-links" className="flex flex-wrap items-center justify-end gap-3">
            {isRecipeImportEnabled ? (
              <Link id="new-recipe-import-link" href="/recipes/import" className="text-link text-sm">
                {messages.recipe.importLink}
              </Link>
            ) : null}
            <Link id="new-recipe-back-link" href="/" className="text-link text-sm">
              {messages.common.backToRecipes}
            </Link>
          </div>
        </div>

        <RecipeDetailsForm
          baseId="new-recipe"
          description={description}
          error={error}
          familyOptions={familyOptions}
          ingredients={ingredients}
          isSubmitting={isSubmitting}
          newImages={newImages}
          onAddIngredient={addIngredientRow}
          onImageSelection={handleImageSelection}
          onRemoveImage={removeNewImage}
          onRemoveIngredient={removeIngredientRow}
          onSetDescription={setDescription}
          onSetPrimaryNewImageId={setPrimaryNewImageId}
          onSetPrimarySourceDocumentId={() => undefined}
          onSetRecipeLanguage={setRecipeLanguage}
          onSetStepsMarkdown={setStepsMarkdown}
          onSetTitle={setTitle}
          onSetVisibility={setVisibility}
          onSubmit={handleSubmit}
          onToggleSelectedFamily={toggleSelectedFamily}
          onUpdateIngredient={updateIngredient}
          primaryNewImageId={primaryNewImageId}
          primarySourceDocumentId={null}
          recipeLanguage={recipeLanguage}
          selectedFamilyIds={selectedFamilyIds}
          sourceDocuments={[]}
          stepsMarkdown={stepsMarkdown}
          title={title}
          visibility={visibility}
        />
      </div>
    </section>
  );
}
