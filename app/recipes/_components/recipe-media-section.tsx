"use client";

import { buttonClassName } from "@/app/_components/ui/button-styles";
import { useMessages } from "@/app/_components/locale-provider";
import {
  buildRecipeMediaGroups,
  type RecipeMediaSourceDocumentInput,
} from "@/lib/application/recipes/recipe-media-groups";
import type { RecipeDetailsImageDraft } from "@/lib/application/recipes/recipe-details-draft";

type RecipeMediaSectionProps = {
  baseId: string;
  maxImages: number;
  newImages: RecipeDetailsImageDraft[];
  onImageSelection: (files: FileList | null) => void;
  onRemoveImage: (imageId: number) => void;
  onSetPrimaryNewImageId: (imageId: number) => void;
  onSetPrimarySourceDocumentId: (sourceDocumentId: number) => void;
  primaryNewImageId: number | null;
  primarySourceDocumentId: number | null;
  sourceDocuments: RecipeMediaSourceDocumentInput[];
};

export default function RecipeMediaSection({
  baseId,
  maxImages,
  newImages,
  onImageSelection,
  onRemoveImage,
  onSetPrimaryNewImageId,
  onSetPrimarySourceDocumentId,
  primaryNewImageId,
  primarySourceDocumentId,
  sourceDocuments,
}: RecipeMediaSectionProps) {
  const messages = useMessages();
  const mediaGroups = buildRecipeMediaGroups({
    recipeImages: newImages.map((image) => ({
      id: image.id,
      label: image.file.name,
      thumbnailUrl: image.previewUrl,
      fullUrl: image.previewUrl,
      isPrimary: primarySourceDocumentId == null && primaryNewImageId === image.id,
    })),
    sourceDocuments,
    primaryMediaReference:
      primarySourceDocumentId != null
        ? { type: "source-document", id: primarySourceDocumentId }
        : primaryNewImageId != null
          ? { type: "recipe-image", id: primaryNewImageId }
          : null,
  });
  const recipeImagesGroup = mediaGroups.groups.find((group) => group.id === "recipe-images");
  const sourcePagesGroup = mediaGroups.groups.find((group) => group.id === "imported-source-pages");

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
          {newImages.length}/{maxImages}
        </span>
      </div>

      <div id={`${baseId}-media-content`} className="space-y-4">
        <input
          id={`${baseId}-images-input`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => onImageSelection(event.target.files)}
          className="input-base"
        />

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
                        onChange={() => onSetPrimaryNewImageId(image.mediaReference.id)}
                        className="mr-1"
                      />
                      {messages.recipe.primaryImage}
                    </label>
                    <button
                      id={`${baseId}-recipe-image-remove-${image.mediaReference.id}`}
                      type="button"
                      onClick={() => onRemoveImage(image.mediaReference.id)}
                      className={buttonClassName("secondary")}
                    >
                      {messages.recipe.remove}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p id={`${baseId}-recipe-images-empty`} className="text-sm text-[var(--color-text-muted)]">
              {messages.recipe.noImagesSelected}
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
