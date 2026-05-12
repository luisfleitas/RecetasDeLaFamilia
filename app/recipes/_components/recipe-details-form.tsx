"use client";

import { FormEvent } from "react";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import RecipeLanguageControl from "@/app/recipes/_components/recipe-language-control";
import { IngredientEditor } from "@/app/recipes/_components/ingredient-editor";
import RecipeMediaSection from "@/app/recipes/_components/recipe-media-section";
import SimpleRichTextEditor from "@/app/recipes/_components/simple-rich-text-editor";
import { useMessages } from "@/app/_components/locale-provider";
import type {
  RecipeDetailsExistingImageDraft,
  RecipeDetailsImageDraft,
  RecipeDetailsIngredientDraft,
  RecipeDetailsSourceDocumentDraft,
  RecipeDetailsVisibility,
} from "@/lib/application/recipes/recipe-details-draft";
import type { RecipeLanguage } from "@/lib/domain/recipe-language";

export type RecipeDetailsFamilyOption = {
  id: number;
  name: string;
};

type RecipeDetailsFormProps = {
  baseId: string;
  description: string;
  error: string | null;
  existingImages?: RecipeDetailsExistingImageDraft[];
  familyOptions: RecipeDetailsFamilyOption[];
  ingredients: RecipeDetailsIngredientDraft[];
  isSubmitting: boolean;
  mode?: "create" | "edit";
  newImages: RecipeDetailsImageDraft[];
  onRemoveExistingImage?: (imageId: number) => void;
  onAddIngredient: () => void;
  onImageSelection: (files: FileList | null) => void;
  onRemoveImage: (imageId: number) => void;
  onRemoveIngredient: (rowId: number) => void;
  onSetDescription: (value: string) => void;
  onSetPrimaryExistingImageId?: (imageId: number) => void;
  onSetPrimaryNewImageId: (imageId: number) => void;
  onSetPrimarySourceDocumentId: (sourceDocumentId: number) => void;
  onSetRecipeLanguage: (value: RecipeLanguage) => void;
  onSetStepsMarkdown: (value: string) => void;
  onSetTitle: (value: string) => void;
  onSetVisibility: (value: RecipeDetailsVisibility) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleSelectedFamily: (familyId: number) => void;
  onUpdateIngredient: (
    rowId: number,
    field: keyof Omit<RecipeDetailsIngredientDraft, "rowId">,
    value: string,
  ) => void;
  primaryExistingImageId?: number | null;
  primaryNewImageId: number | null;
  primarySourceDocumentId: number | null;
  recipeLanguage: RecipeLanguage;
  removingExistingImageIds?: number[];
  selectedFamilyIds: number[];
  sourceDocuments: RecipeDetailsSourceDocumentDraft[];
  stepsMarkdown: string;
  title: string;
  visibility: RecipeDetailsVisibility;
};

const MAX_IMAGES = 8;

export function RecipeDetailsForm({
  baseId,
  description,
  error,
  existingImages = [],
  familyOptions,
  ingredients,
  isSubmitting,
  mode = "create",
  newImages,
  onRemoveExistingImage,
  onAddIngredient,
  onImageSelection,
  onRemoveImage,
  onRemoveIngredient,
  onSetDescription,
  onSetPrimaryExistingImageId,
  onSetPrimaryNewImageId,
  onSetPrimarySourceDocumentId,
  onSetRecipeLanguage,
  onSetStepsMarkdown,
  onSetTitle,
  onSetVisibility,
  onSubmit,
  onToggleSelectedFamily,
  onUpdateIngredient,
  primaryExistingImageId = null,
  primaryNewImageId,
  primarySourceDocumentId,
  recipeLanguage,
  removingExistingImageIds = [],
  selectedFamilyIds,
  sourceDocuments,
  stepsMarkdown,
  title,
  visibility,
}: RecipeDetailsFormProps) {
  const messages = useMessages();
  const titleInputId = `${baseId}-title-input`;
  const descriptionInputId = `${baseId}-description-input`;
  const stepsInputId = `${baseId}-steps-input`;
  const richTextLabels = messages.recipe.richText;
  const isEditMode = mode === "edit";

  return (
    <form id={`${baseId}-form`} onSubmit={onSubmit} className="space-y-4">
      <div id={`${baseId}-basic-info-section`} className="surface-card recipe-form-section p-4">
        <div id={`${baseId}-basic-info-header`} className="recipe-form-section-header">
          <div id={`${baseId}-basic-info-copy`} className="recipe-form-section-copy">
            <p id={`${baseId}-basic-info-title`} className="recipe-form-section-title">
              {messages.recipe.basicInfoTitle}
            </p>
            <p id={`${baseId}-basic-info-description`} className="recipe-form-section-description">
              {isEditMode ? messages.recipe.editBasicInfoDescription : messages.recipe.basicInfoDescription}
            </p>
          </div>
        </div>

        <div id={`${baseId}-title-field`}>
          <label id={`${baseId}-title-label`} htmlFor={titleInputId} className="mb-1 block text-sm font-medium">
            {messages.recipe.titleLabel}
          </label>
          <input
            id={titleInputId}
            name="title"
            required
            value={title}
            onChange={(event) => onSetTitle(event.target.value)}
            className="input-base"
          />
        </div>

        <div id={`${baseId}-description-field`}>
          <label
            id={`${baseId}-description-label`}
            htmlFor={descriptionInputId}
            className="mb-1 block text-sm font-medium"
          >
            {messages.recipe.descriptionLabel}
          </label>
          <SimpleRichTextEditor
            baseId={`${baseId}-description`}
            labels={richTextLabels}
            name="description"
            rows={2}
            value={description}
            onChange={onSetDescription}
          />
        </div>

        <RecipeLanguageControl
          baseId={`${baseId}-language`}
          value={recipeLanguage}
          onChange={onSetRecipeLanguage}
        />
      </div>

      <div id={`${baseId}-sharing-section`} className="surface-card recipe-form-section p-4">
        <div id={`${baseId}-sharing-header`} className="recipe-form-section-header">
          <div id={`${baseId}-sharing-copy`} className="recipe-form-section-copy">
            <p id={`${baseId}-sharing-title`} className="recipe-form-section-title">
              {messages.recipe.sharingTitle}
            </p>
            <p id={`${baseId}-sharing-description`} className="recipe-form-section-description">
              {isEditMode ? messages.recipe.sharingEditDescription : messages.recipe.sharingCreateDescription}
            </p>
          </div>
        </div>

        <div id={`${baseId}-sharing-visibility-group`} className="flex flex-wrap gap-4">
          <label id={`${baseId}-sharing-public-label`} className="text-sm">
            <input
              id={`${baseId}-sharing-public-input`}
              type="radio"
              name="recipeVisibility"
              checked={visibility === "public"}
              onChange={() => onSetVisibility("public")}
              className="mr-2"
            />
            {messages.recipe.visibilityPublic}
          </label>
          <label id={`${baseId}-sharing-private-label`} className="text-sm">
            <input
              id={`${baseId}-sharing-private-input`}
              type="radio"
              name="recipeVisibility"
              checked={visibility === "private"}
              onChange={() => onSetVisibility("private")}
              className="mr-2"
            />
            {messages.recipe.visibilityPrivate}
          </label>
          <label id={`${baseId}-sharing-family-label`} className="text-sm">
            <input
              id={`${baseId}-sharing-family-input`}
              type="radio"
              name="recipeVisibility"
              checked={visibility === "family"}
              onChange={() => onSetVisibility("family")}
              className="mr-2"
            />
            {messages.recipe.visibilityFamily}
          </label>
        </div>

        {visibility === "family" ? (
          <div id={`${baseId}-sharing-families-section`} className="space-y-2">
            <p id={`${baseId}-sharing-families-title`} className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              {messages.recipe.selectFamilies}
            </p>
            {familyOptions.length > 0 ? (
              <ul id={`${baseId}-sharing-families-list`} className="space-y-2">
                {familyOptions.map((family) => (
                  <li id={`${baseId}-sharing-family-item-${family.id}`} key={family.id}>
                    <label id={`${baseId}-sharing-family-label-${family.id}`} className="text-sm">
                      <input
                        id={`${baseId}-sharing-family-input-${family.id}`}
                        type="checkbox"
                        checked={selectedFamilyIds.includes(family.id)}
                        onChange={() => onToggleSelectedFamily(family.id)}
                        className="mr-2"
                      />
                      {family.name}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p id={`${baseId}-sharing-families-empty`} className="text-sm text-[var(--color-text-muted)]">
                {messages.recipe.noFamilies}
              </p>
            )}
          </div>
        ) : null}
      </div>

      <IngredientEditor
        addButtonId={`${baseId}-add-ingredient`}
        baseId={`${baseId}-ingredients`}
        ingredients={ingredients}
        onAdd={onAddIngredient}
        onRemove={onRemoveIngredient}
        onUpdate={onUpdateIngredient}
        title={messages.recipe.ingredientsTitle}
      />

      <RecipeMediaSection
        baseId={baseId}
        existingImages={existingImages}
        maxImages={MAX_IMAGES}
        newImages={newImages}
        onImageSelection={onImageSelection}
        onRemoveExistingImage={onRemoveExistingImage}
        onRemoveImage={onRemoveImage}
        onSetPrimaryExistingImageId={onSetPrimaryExistingImageId}
        onSetPrimaryNewImageId={onSetPrimaryNewImageId}
        onSetPrimarySourceDocumentId={onSetPrimarySourceDocumentId}
        primaryExistingImageId={primaryExistingImageId}
        primaryNewImageId={primaryNewImageId}
        primarySourceDocumentId={primarySourceDocumentId}
        removingExistingImageIds={removingExistingImageIds}
        sourceDocuments={sourceDocuments}
      />

      <div id={`${baseId}-steps-section`} className="surface-card recipe-form-section p-4">
        <div id={`${baseId}-steps-header`} className="recipe-form-section-header">
          <div id={`${baseId}-steps-copy`} className="recipe-form-section-copy">
            <p id={`${baseId}-steps-title`} className="recipe-form-section-title">
              {messages.recipe.stepsTitle}
            </p>
            <p id={`${baseId}-steps-description`} className="recipe-form-section-description">
              {isEditMode ? messages.recipe.stepsEditDescription : messages.recipe.stepsCreateDescription}
            </p>
          </div>
        </div>
        <div id={`${baseId}-steps-field`}>
          <label id={`${baseId}-steps-label`} htmlFor={stepsInputId} className="mb-1 block text-sm font-medium">
            {messages.recipe.stepsLabel}
          </label>
          <SimpleRichTextEditor
            baseId={`${baseId}-steps`}
            labels={richTextLabels}
            name="stepsMarkdown"
            rows={6}
            required
            value={stepsMarkdown}
            onChange={onSetStepsMarkdown}
          />
        </div>
      </div>

      {error ? (
        <p id={`${baseId}-error`} className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      <button id={`${baseId}-submit`} type="submit" disabled={isSubmitting} className={buttonClassName("primary")}>
        {isSubmitting
          ? isEditMode
            ? messages.recipe.savingSubmit
            : messages.recipe.creatingSubmit
          : isEditMode
            ? messages.recipe.saveSubmit
            : messages.recipe.createSubmit}
      </button>
    </form>
  );
}
