"use client";

import { useRef } from "react";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import { useMessages } from "@/app/_components/locale-provider";
import {
  buildRecipeMediaGroups,
  type RecipeMediaSourceDocumentInput,
} from "@/lib/application/recipes/recipe-media-groups";
import type {
  RecipeDetailsExistingImageDraft,
  RecipeDetailsImageDraft,
} from "@/lib/application/recipes/recipe-details-draft";

type RecipeMediaSectionProps = {
  baseId: string;
  existingImages?: RecipeDetailsExistingImageDraft[];
  maxImages: number;
  newImages: RecipeDetailsImageDraft[];
  onRemoveExistingImage?: (imageId: number) => void;
  onImageSelection: (files: FileList | null) => void;
  onRemoveImage: (imageId: number) => void;
  onSetPrimaryExistingImageId?: (imageId: number) => void;
  onSetPrimaryNewImageId: (imageId: number) => void;
  onSetPrimarySourceDocumentId: (sourceDocumentId: number) => void;
  primaryExistingImageId?: number | null;
  primaryNewImageId: number | null;
  primarySourceDocumentId: number | null;
  removingExistingImageIds?: number[];
  sourceDocuments: RecipeMediaSourceDocumentInput[];
};

export default function RecipeMediaSection({
  baseId,
  existingImages = [],
  maxImages,
  newImages,
  onRemoveExistingImage,
  onImageSelection,
  onRemoveImage,
  onSetPrimaryExistingImageId,
  onSetPrimaryNewImageId,
  onSetPrimarySourceDocumentId,
  primaryExistingImageId = null,
  primaryNewImageId,
  primarySourceDocumentId,
  removingExistingImageIds = [],
  sourceDocuments,
}: RecipeMediaSectionProps) {
  const messages = useMessages();
  const existingImageIds = new Set(existingImages.map((image) => image.id));
  const mediaGroups = buildRecipeMediaGroups({
    recipeImages: [
      ...existingImages.map((image) => ({
        id: image.id,
        label: image.label,
        thumbnailUrl: image.thumbnailUrl,
        fullUrl: image.fullUrl,
        isPrimary: primarySourceDocumentId == null && primaryExistingImageId === image.id,
      })),
      ...newImages.map((image) => ({
        id: image.id,
        label: image.file.name,
        thumbnailUrl: image.previewUrl,
        fullUrl: image.previewUrl,
        isPrimary:
          primarySourceDocumentId == null &&
          primaryExistingImageId == null &&
          primaryNewImageId === image.id,
      })),
    ],
    sourceDocuments,
    primaryMediaReference:
      primarySourceDocumentId != null
        ? { type: "source-document", id: primarySourceDocumentId }
        : primaryExistingImageId != null
          ? { type: "recipe-image", id: primaryExistingImageId }
        : primaryNewImageId != null
          ? { type: "recipe-image", id: primaryNewImageId }
          : null,
  });
  const recipeImagesGroup = mediaGroups.groups.find((group) => group.id === "recipe-images");
  const sourcePagesGroup = mediaGroups.groups.find((group) => group.id === "imported-source-pages");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const totalRecipeImageCount = existingImages.length + newImages.length;
  const remainingImageSlots = Math.max(maxImages - totalRecipeImageCount, 0);
  const hasRecipeImages = Boolean(recipeImagesGroup && recipeImagesGroup.items.length > 0);
  const imageCountLabel = messages.recipe.photoCount
    .replace("{count}", String(totalRecipeImageCount))
    .replace("{max}", String(maxImages));
  const remainingImageLabel = messages.recipe.photoRemaining.replace(
    "{count}",
    String(remainingImageSlots),
  );
  const onePhotoHint = messages.recipe.onePhotoHint.replace(
    "{count}",
    String(remainingImageSlots),
  );

  function openImagePicker() {
    imageInputRef.current?.click();
  }

  return (
    <div id={`${baseId}-media-section`} className="surface-card recipe-form-section p-4">
      <div id={`${baseId}-media-header`} className="mb-3 flex items-center justify-between">
        <div id={`${baseId}-media-copy`} className="recipe-form-section-copy">
          <p id={`${baseId}-media-title`} className="recipe-form-section-title">
            {messages.recipe.mediaTitle}
          </p>
          <p id={`${baseId}-media-description`} className="recipe-form-section-description">
            {messages.recipe.mediaCreateDescription}
          </p>
        </div>
        <span id={`${baseId}-media-count`} className="text-xs text-[var(--color-text-muted)]">
          {imageCountLabel}
        </span>
      </div>

      <div id={`${baseId}-media-content`} className="space-y-4">
        <input
          id={`${baseId}-images-input`}
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          aria-describedby={`${baseId}-images-input-help`}
          onChange={(event) => {
            onImageSelection(event.target.files);
            event.currentTarget.value = "";
          }}
          className="sr-only"
        />

        <div
          id={`${baseId}-images-picker-panel`}
          className={`rounded-[var(--radius-sm)] border p-4 ${
            hasRecipeImages
              ? "border-[var(--color-border)] bg-[var(--color-surface-soft)]"
              : "border-dashed border-[var(--color-border)] bg-[var(--color-surface)]"
          }`}
        >
          <div
            id={`${baseId}-images-picker-main`}
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div id={`${baseId}-images-picker-copy`} className="recipe-form-section-copy">
              <p id={`${baseId}-images-picker-title`} className="recipe-form-section-title">
                {messages.recipe.recipePhotosPickerTitle}
              </p>
              <p id={`${baseId}-images-picker-help`} className="recipe-form-section-description">
                {hasRecipeImages
                  ? messages.recipe.recipePhotosPickerSelectedHelp
                  : messages.recipe.recipePhotosPickerEmptyHelp}
              </p>
              <p id={`${baseId}-images-input-help`} className="text-xs text-[var(--color-text-muted)]">
                {messages.recipe.photoUploadLimits}
              </p>
            </div>

            <div id={`${baseId}-images-picker-actions`} className="flex flex-col gap-2 sm:items-end">
              <button
                id={hasRecipeImages ? `${baseId}-images-add-more-button` : `${baseId}-images-add-button`}
                type="button"
                onClick={openImagePicker}
                disabled={remainingImageSlots === 0}
                className={buttonClassName(hasRecipeImages ? "secondary" : "primary")}
              >
                {hasRecipeImages ? messages.recipe.addMorePhotos : messages.recipe.addPhotos}
              </button>
              {hasRecipeImages && remainingImageSlots > 0 ? (
                <span id={`${baseId}-images-remaining`} className="text-xs text-[var(--color-text-muted)]">
                  {remainingImageLabel}
                </span>
              ) : null}
            </div>
          </div>

          {totalRecipeImageCount === 1 && remainingImageSlots > 0 ? (
            <p
              id={`${baseId}-images-one-photo-hint`}
              className="mt-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-muted)]"
            >
              {onePhotoHint}
            </p>
          ) : null}
        </div>

        <section id={`${baseId}-recipe-images-group`} className="recipe-media-group">
          <h3 id={`${baseId}-recipe-images-group-title`} className="recipe-media-group-title">
            {messages.recipe.recipeImagesGroupTitle}
          </h3>
          {recipeImagesGroup && recipeImagesGroup.items.length > 0 ? (
            <ul id={`${baseId}-recipe-images-list`} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {recipeImagesGroup.items.map((image) => (
                <li
                  id={`${baseId}-recipe-image-item-${image.mediaReference.id}`}
                  key={image.id}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3"
                >
                  <img
                    id={`${baseId}-recipe-image-preview-${image.mediaReference.id}`}
                    src={image.thumbnailUrl}
                    alt={image.label}
                    className="h-36 w-full rounded-[var(--radius-sm)] object-cover"
                  />
                  <p id={`${baseId}-recipe-image-name-${image.mediaReference.id}`} className="mt-2 truncate text-xs text-[var(--color-text-muted)]">
                    {image.label}
                  </p>
                  <div id={`${baseId}-recipe-image-actions-${image.mediaReference.id}`} className="mt-2 flex items-center gap-2">
                    <label id={`${baseId}-recipe-image-primary-label-${image.mediaReference.id}`} className="text-xs">
                      <input
                        id={`${baseId}-recipe-image-primary-${image.mediaReference.id}`}
                        type="radio"
                        name={`${baseId}-primary-media`}
                        checked={image.isPrimary}
                        onChange={() => {
                          if (existingImageIds.has(image.mediaReference.id)) {
                            onSetPrimaryExistingImageId?.(image.mediaReference.id);
                            return;
                          }
                          onSetPrimaryNewImageId(image.mediaReference.id);
                        }}
                        className="mr-1"
                      />
                      {messages.recipe.primaryImage}
                    </label>
                    <button
                      id={`${baseId}-recipe-image-remove-${image.mediaReference.id}`}
                      type="button"
                      onClick={() => {
                        if (existingImageIds.has(image.mediaReference.id)) {
                          onRemoveExistingImage?.(image.mediaReference.id);
                          return;
                        }
                        onRemoveImage(image.mediaReference.id);
                      }}
                      disabled={removingExistingImageIds.includes(image.mediaReference.id)}
                      className={buttonClassName("secondary")}
                    >
                      {removingExistingImageIds.includes(image.mediaReference.id)
                        ? messages.recipe.removing
                        : messages.recipe.remove}
                    </button>
                  </div>
                </li>
              ))}
              {remainingImageSlots > 0 ? (
                <li
                  id={`${baseId}-recipe-image-add-tile`}
                  className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center"
                >
                  <button
                    id={`${baseId}-recipe-image-add-tile-button`}
                    type="button"
                    onClick={openImagePicker}
                    className={buttonClassName("secondary")}
                  >
                    {messages.recipe.addMorePhotos}
                  </button>
                  <span
                    id={`${baseId}-recipe-image-add-tile-remaining`}
                    className="text-xs text-[var(--color-text-muted)]"
                  >
                    {remainingImageLabel}
                  </span>
                </li>
              ) : null}
            </ul>
          ) : (
            <p id={`${baseId}-recipe-images-empty`} className="text-sm text-[var(--color-text-muted)]">
              {messages.recipe.recipePhotosPickerEmptyHelp}
            </p>
          )}
        </section>

        <section id={`${baseId}-imported-source-pages-group`} className="recipe-media-group">
          <h3 id={`${baseId}-imported-source-pages-group-title`} className="recipe-media-group-title">
            {messages.recipe.importedSourcePagesGroupTitle}
          </h3>
          {sourcePagesGroup && sourcePagesGroup.items.length > 0 ? (
            <ul id={`${baseId}-imported-source-pages-list`} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sourcePagesGroup.items.map((sourcePage) => (
                <li
                  id={`${baseId}-source-page-item-${sourcePage.mediaReference.id}`}
                  key={sourcePage.id}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3"
                >
                  <img
                    id={`${baseId}-source-page-preview-${sourcePage.mediaReference.id}`}
                    src={sourcePage.thumbnailUrl}
                    alt={sourcePage.label}
                    className="h-36 w-full rounded-[var(--radius-sm)] object-cover"
                  />
                  <div id={`${baseId}-source-page-summary-${sourcePage.mediaReference.id}`} className="mt-2 flex items-center justify-between gap-2">
                    <p id={`${baseId}-source-page-name-${sourcePage.mediaReference.id}`} className="truncate text-xs text-[var(--color-text-muted)]">
                      {sourcePage.label}
                    </p>
                    <span id={`${baseId}-source-page-visibility-${sourcePage.mediaReference.id}`} className="recipe-media-visibility-badge">
                      {sourcePage.visibility === "public"
                        ? messages.recipe.sourceVisibilityBadgePublic
                        : messages.recipe.sourceVisibilityBadgePrivate}
                    </span>
                  </div>
                  <label id={`${baseId}-source-page-primary-label-${sourcePage.mediaReference.id}`} className="mt-2 block text-xs">
                    <input
                      id={`${baseId}-source-page-primary-${sourcePage.mediaReference.id}`}
                      type="radio"
                      name={`${baseId}-primary-media`}
                      checked={sourcePage.isPrimary}
                      onChange={() => onSetPrimarySourceDocumentId(sourcePage.mediaReference.id)}
                      className="mr-1"
                    />
                    {messages.recipe.primaryImage}
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p id={`${baseId}-imported-source-pages-empty`} className="text-sm text-[var(--color-text-muted)]">
              {messages.recipe.noImportedSourcePages}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
