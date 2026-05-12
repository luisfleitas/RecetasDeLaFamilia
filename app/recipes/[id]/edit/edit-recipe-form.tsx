"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RecipeDetailsForm, type RecipeDetailsFamilyOption } from "@/app/recipes/_components/recipe-details-form";
import { useMessages } from "@/app/_components/locale-provider";
import { RECIPE_IMAGE_MAX_UPLOAD_BYTES } from "@/lib/application/recipes/image-upload-constraints";
import {
  buildEditRecipeDetailsPayload,
  hydrateEditRecipeDetailsDraftFromRecipe,
  type EditRecipeDetailsRecipe,
  type RecipeDetailsImageDraft,
  type RecipeDetailsIngredientDraft,
  type RecipeDetailsVisibility,
} from "@/lib/application/recipes/recipe-details-draft";
import { serializeRecipeMediaReference } from "@/lib/application/recipes/recipe-media-groups";
import type { RecipeLanguage } from "@/lib/domain/recipe-language";

type UpdateRecipeResponse = {
  recipe?: { id: number };
  error?: string;
};

type UploadRecipeImageResponse = {
  recipe?: { id: number };
  error?: string;
};

const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = RECIPE_IMAGE_MAX_UPLOAD_BYTES;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function EditRecipeForm({ recipe }: { recipe: EditRecipeDetailsRecipe }) {
  const router = useRouter();
  const messages = useMessages();
  const editDraft = useMemo(() => hydrateEditRecipeDetailsDraftFromRecipe(recipe), [recipe]);
  const [title, setTitle] = useState(editDraft.title);
  const [description, setDescription] = useState(editDraft.description);
  const [stepsMarkdown, setStepsMarkdown] = useState(editDraft.stepsMarkdown);
  const [recipeLanguage, setRecipeLanguage] = useState<RecipeLanguage>(editDraft.language);
  const [ingredients, setIngredients] = useState<RecipeDetailsIngredientDraft[]>(editDraft.ingredients);
  const [existingImages, setExistingImages] = useState(editDraft.existingImages);
  const [newImages, setNewImages] = useState<RecipeDetailsImageDraft[]>([]);
  const [nextImageId, setNextImageId] = useState(
    Math.max(0, ...editDraft.existingImages.map((image) => image.id)) + 1,
  );
  const [primaryExistingImageId, setPrimaryExistingImageId] = useState<number | null>(
    editDraft.primaryExistingImageId,
  );
  const [primaryNewImageId, setPrimaryNewImageId] = useState<number | null>(null);
  const [primarySourceDocumentId, setPrimarySourceDocumentId] = useState<number | null>(
    editDraft.primarySourceDocumentId,
  );
  const [visibility, setVisibility] = useState<RecipeDetailsVisibility>(editDraft.visibility);
  const [familyOptions, setFamilyOptions] = useState<RecipeDetailsFamilyOption[]>([]);
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<number[]>(editDraft.selectedFamilyIds);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingImageIds, setRemovingImageIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isRemovingImage = removingImageIds.length > 0;

  useEffect(() => {
    async function loadFamilies() {
      try {
        const response = await fetch("/api/families", { cache: "no-store" });
        const data = (await response.json()) as {
          families?: Array<{ id: number; name: string }>;
        };

        if (!response.ok || !data.families) {
          return;
        }

        const nextFamilyOptions = data.families.map((family) => ({ id: family.id, name: family.name }));
        const familyIdSet = new Set(nextFamilyOptions.map((family) => family.id));

        setFamilyOptions(nextFamilyOptions);
        setSelectedFamilyIds((current) => current.filter((familyId) => familyIdSet.has(familyId)));
      } catch {
        // Keep options empty if unavailable.
      }
    }

    void loadFamilies();
  }, []);

  function updateIngredient(rowId: number, field: keyof Omit<RecipeDetailsIngredientDraft, "rowId">, value: string) {
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
    setRemovingImageIds((current) => (current.includes(imageId) ? current : [...current, imageId]));

    try {
      const response = await fetch(`/api/recipes/${recipe.id}/images/${imageId}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { promotedPrimaryImageId?: number | null; error?: string };
      if (!response.ok) {
        setError(data.error ?? messages.recipe.errors.removeImageFailed);
        return;
      }

      setExistingImages((current) => current.filter((image) => image.id !== imageId));
      if (primaryExistingImageId === imageId) {
        setPrimaryExistingImageId(data.promotedPrimaryImageId ?? null);
      }
      router.refresh();
    } catch {
      setError(messages.recipe.errors.removeImageFailed);
    } finally {
      setRemovingImageIds((current) => current.filter((id) => id !== imageId));
    }
  }

  function handleImageSelection(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const selected = Array.from(files);
    const nextTotal = totalImageCount() + selected.length;
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
      if (primaryExistingImageId == null && primaryNewImageId == null && primarySourceDocumentId == null) {
        setPrimaryNewImageId(combined[0]?.id ?? null);
      }
      return combined;
    });
  }

  function setExistingImagePrimary(imageId: number) {
    setPrimaryExistingImageId(imageId);
    setPrimaryNewImageId(null);
    setPrimarySourceDocumentId(null);
  }

  function setNewImagePrimary(imageId: number) {
    setPrimaryNewImageId(imageId);
    setPrimaryExistingImageId(null);
    setPrimarySourceDocumentId(null);
  }

  function setSourceDocumentPrimary(sourceDocumentId: number) {
    setPrimarySourceDocumentId(sourceDocumentId);
    setPrimaryExistingImageId(null);
    setPrimaryNewImageId(null);
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
        return messages.recipe.errors.updateRecipeFailed;
      case "INVALID_INGREDIENT":
      default:
        return messages.recipe.errors.invalidIngredient;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (totalImageCount() > MAX_IMAGES) {
      setError(messages.recipe.errors.maxImages);
      return;
    }

    if (isRemovingImage) {
      setError(messages.recipe.errors.finishRemovingImages);
      return;
    }

    const draftResult = buildEditRecipeDetailsPayload({
      ...editDraft,
      title,
      description,
      stepsMarkdown,
      language: recipeLanguage,
      ingredients,
      existingImages,
      newImages,
      primaryExistingImageId,
      primaryNewImageId,
      primarySourceDocumentId,
      visibility,
      selectedFamilyIds,
    });

    if (!draftResult.ok) {
      setError(getRecipeDetailsValidationMessage(draftResult.errors[0]?.code ?? "INVALID_INGREDIENT"));
      return;
    }

    const formData = new FormData();
    formData.append("title", draftResult.payload.title);
    formData.append("description", draftResult.payload.description);
    formData.append("stepsMarkdown", draftResult.payload.stepsMarkdown);
    formData.append("language", draftResult.payload.language);
    formData.append("visibility", draftResult.payload.visibility);
    formData.append("ingredients", JSON.stringify(draftResult.payload.ingredients));

    if (draftResult.payload.visibility === "family") {
      for (const familyId of draftResult.payload.familyIds) {
        formData.append("familyIds", String(familyId));
      }
    }

    if (draftResult.payload.primaryMediaReference) {
      formData.append("primaryMediaReference", serializeRecipeMediaReference(draftResult.payload.primaryMediaReference));
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PUT",
        body: formData,
      });

      const data = (await response.json()) as UpdateRecipeResponse;

      if (!response.ok || !data.recipe) {
        setError(data.error ?? messages.recipe.errors.updateRecipeFailed);
        return;
      }

      for (const image of draftResult.imageUploads) {
        const imageFormData = new FormData();
        imageFormData.append("image", image.file);
        if (image.makePrimary) {
          imageFormData.append("makePrimary", "true");
        }

        const imageResponse = await fetch(`/api/recipes/${recipe.id}/images`, {
          method: "POST",
          body: imageFormData,
        });
        const imageData = (await imageResponse.json()) as UploadRecipeImageResponse;

        if (!imageResponse.ok || !imageData.recipe) {
          setError(imageData.error ?? messages.recipe.errors.updateRecipeFailed);
          return;
        }
      }

      router.push(`/recipes/${data.recipe.id}`);
      router.refresh();
    } catch {
      setError(messages.recipe.errors.updateRecipeFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RecipeDetailsForm
      baseId="edit-recipe"
      description={description}
      error={error}
      existingImages={existingImages}
      familyOptions={familyOptions}
      ingredients={ingredients}
      isSubmitting={isSubmitting || isRemovingImage}
      mode="edit"
      newImages={newImages}
      onAddIngredient={addIngredientRow}
      onImageSelection={handleImageSelection}
      onRemoveExistingImage={removeExistingImage}
      onRemoveImage={removeNewImage}
      onRemoveIngredient={removeIngredientRow}
      onSetDescription={setDescription}
      onSetPrimaryExistingImageId={setExistingImagePrimary}
      onSetPrimaryNewImageId={setNewImagePrimary}
      onSetPrimarySourceDocumentId={setSourceDocumentPrimary}
      onSetRecipeLanguage={setRecipeLanguage}
      onSetStepsMarkdown={setStepsMarkdown}
      onSetTitle={setTitle}
      onSetVisibility={setVisibility}
      onSubmit={handleSubmit}
      onToggleSelectedFamily={toggleSelectedFamily}
      onUpdateIngredient={updateIngredient}
      primaryExistingImageId={primaryExistingImageId}
      primaryNewImageId={primaryNewImageId}
      primarySourceDocumentId={primarySourceDocumentId}
      recipeLanguage={recipeLanguage}
      removingExistingImageIds={removingImageIds}
      selectedFamilyIds={selectedFamilyIds}
      sourceDocuments={editDraft.sourceDocuments}
      stepsMarkdown={stepsMarkdown}
      title={title}
      visibility={visibility}
    />
  );
}
