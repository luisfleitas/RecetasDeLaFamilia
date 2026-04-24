"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import LocaleSwitcher from "@/app/_components/locale-switcher";
import { useLocale, useMessages } from "@/app/_components/locale-provider";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import RecipeLanguageControl from "@/app/recipes/_components/recipe-language-control";
import {
  getImportWarningsForDraft,
  type ImportWarning,
} from "@/lib/application/recipes/import-warnings";
import type {
  HandwrittenSourceImageVisibility,
  ImportSessionMetadata,
  ImportSessionSourceRef,
  RecipeImportInputMode,
} from "@/lib/application/recipes/import-session-metadata";
import type { ImportedRecipeDraft } from "@/lib/application/recipes/text-document-import";
import type { RecipeLanguage } from "@/lib/domain/recipe-language";

type ParseResponse = {
  importSessionId?: string;
  draft?: ImportedRecipeDraft;
  warnings?: ImportWarning[];
  error?: string;
  sourceRefs?: ImportSessionSourceRef[];
  metadata?: ImportSessionMetadata | null;
};

type IngredientDraft = {
  rowId: number;
  name: string;
  qty: string;
  unit: string;
  notes: string;
};

type ImportRecipeFormProps = {
  handwrittenEnabled: boolean;
};

function toEditableIngredients(draft: ImportedRecipeDraft): IngredientDraft[] {
  return draft.ingredients.map((ingredient, index) => ({
    rowId: index + 1,
    name: ingredient.name,
    qty: ingredient.qty.toString(),
    unit: ingredient.unit,
    notes: ingredient.notes ?? "",
  }));
}

export default function ImportRecipeForm({ handwrittenEnabled }: ImportRecipeFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const messages = useMessages();
  const [inputMode, setInputMode] = useState<RecipeImportInputMode>("document");
  const [rawText, setRawText] = useState("");
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [handwrittenFiles, setHandwrittenFiles] = useState<File[]>([]);
  const [draft, setDraft] = useState<ImportedRecipeDraft | null>(null);
  const [importSessionId, setImportSessionId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ImportSessionMetadata | null>(null);
  const [sourceRefs, setSourceRefs] = useState<ImportSessionSourceRef[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stepsMarkdown, setStepsMarkdown] = useState("");
  const [recipeLanguage, setRecipeLanguage] = useState<RecipeLanguage>("en");
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [sourceImageVisibility, setSourceImageVisibility] =
    useState<HandwrittenSourceImageVisibility>("private");

  const canParse = useMemo(() => {
    if (inputMode === "handwritten") {
      return handwrittenFiles.length > 0;
    }

    return rawText.trim().length > 0 || selectedDocumentFile != null;
  }, [handwrittenFiles.length, inputMode, rawText, selectedDocumentFile]);

  const draftWarnings = useMemo<ImportWarning[]>(() => {
    if (!draft) {
      return [];
    }

    return getImportWarningsForDraft({
      title: title.trim(),
      description: description.trim().length > 0 ? description.trim() : null,
      stepsMarkdown: stepsMarkdown.trim(),
      language: recipeLanguage,
      ingredients: ingredients.map((ingredient, index) => ({
        name: ingredient.name.trim(),
        qty: Number(ingredient.qty),
        unit: ingredient.unit.trim(),
        notes: ingredient.notes.trim().length > 0 ? ingredient.notes.trim() : null,
        position: index + 1,
      })),
    });
  }, [description, draft, ingredients, recipeLanguage, stepsMarkdown, title]);

  const handwrittenReviewHints = metadata?.handwritten?.reviewHints ?? [];
  const mergedPageNote =
    metadata?.handwritten && metadata.handwritten.imageCount > 1
      ? `Pages were combined in upload order (${metadata.handwritten.pageOrder.join(", ")}).`
      : null;

  function resetParsedState() {
    setDraft(null);
    setImportSessionId(null);
    setMetadata(null);
    setSourceRefs([]);
  }

  function applyDraft(nextDraft: ImportedRecipeDraft) {
    setDraft(nextDraft);
    setTitle(nextDraft.title);
    setDescription(nextDraft.description ?? "");
    setStepsMarkdown(nextDraft.stepsMarkdown);
    setRecipeLanguage(nextDraft.language);
    setIngredients(toEditableIngredients(nextDraft));
  }

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
      return [...current, { rowId: maxRowId + 1, name: "", qty: "", unit: "", notes: "" }];
    });
  }

  function removeIngredientRow(rowId: number) {
    setIngredients((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter((ingredient) => ingredient.rowId !== rowId);
    });
  }

  function handleModeChange(nextMode: RecipeImportInputMode) {
    setInputMode(nextMode);
    setError(null);
    resetParsedState();
  }

  async function handleParse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsParsing(true);

    try {
      let response: Response;

      if (inputMode === "handwritten") {
        const formData = new FormData();
        formData.append("inputMode", "handwritten");
        handwrittenFiles.forEach((file) => {
          formData.append("files", file);
        });
        response = await fetch("/api/recipes/import/parse", {
          method: "POST",
          body: formData,
        });
      } else {
        const hasText = rawText.trim().length > 0;
        response = await fetch("/api/recipes/import/parse", {
          method: "POST",
          ...(hasText
            ? {
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ content: rawText, inputMode: "document" }),
              }
            : (() => {
                const formData = new FormData();
                formData.append("inputMode", "document");
                if (selectedDocumentFile) {
                  formData.append("file", selectedDocumentFile);
                }
                return { body: formData };
              })()),
        });
      }

      const data = (await response.json()) as ParseResponse;
      if (!response.ok || !data.draft || !data.importSessionId) {
        resetParsedState();
        setError(data.error ?? messages.recipe.errors.parseRecipeFailed);
        return;
      }

      setImportSessionId(data.importSessionId);
      setMetadata(data.metadata ?? null);
      setSourceRefs(data.sourceRefs ?? []);
      setSourceImageVisibility(data.metadata?.handwritten?.sourceImageVisibility ?? "private");
      applyDraft(data.draft);
    } catch {
      resetParsedState();
      setError(messages.recipe.errors.parseRecipeFailed);
    } finally {
      setIsParsing(false);
    }
  }

  async function continueToCreate() {
    if (!draft || !importSessionId) {
      return;
    }

    const payload: ImportedRecipeDraft = {
      title: title.trim(),
      description: description.trim().length > 0 ? description.trim() : null,
      stepsMarkdown: stepsMarkdown.trim(),
      language: recipeLanguage,
      ingredients: ingredients.map((ingredient, index) => ({
        name: ingredient.name.trim(),
        qty: Number(ingredient.qty),
        unit: ingredient.unit.trim(),
        notes: ingredient.notes.trim().length > 0 ? ingredient.notes.trim() : null,
        position: index + 1,
      })),
    };

    const hasInvalidIngredient = payload.ingredients.some(
      (ingredient) =>
        ingredient.name.length === 0 ||
        ingredient.unit.length === 0 ||
        !Number.isFinite(ingredient.qty) ||
        ingredient.qty <= 0,
    );

    if (!payload.title || !payload.stepsMarkdown || payload.ingredients.length === 0 || hasInvalidIngredient) {
      setError(messages.recipe.errors.completeDraftFields);
      return;
    }

    setError(null);
    setIsContinuing(true);
    try {
      const response = await fetch(`/api/recipes/import/sessions/${encodeURIComponent(importSessionId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          draft: payload,
          metadata:
            inputMode === "handwritten"
              ? {
                  handwritten: {
                    sourceImageVisibility,
                  },
                }
              : undefined,
        }),
      });

      const data = (await response.json()) as { error?: string; metadata?: ImportSessionMetadata | null };
      if (!response.ok) {
        setError(data.error ?? messages.recipe.errors.saveImportedDraftFailed);
        return;
      }

      if (data.metadata) {
        setMetadata(data.metadata);
      }
      router.push(`/recipes/new?importSession=${encodeURIComponent(importSessionId)}`);
    } catch {
      setError(messages.recipe.errors.saveImportedDraftFailed);
    } finally {
      setIsContinuing(false);
    }
  }

  function getWarningsForField(field: string): ImportWarning[] {
    return draftWarnings.filter((warning) => warning.field === field);
  }

  function getWarningsForIngredientField(index: number, field: "name" | "qty" | "unit" | "notes"): ImportWarning[] {
    return getWarningsForField(`ingredients.${index}.${field}`);
  }

  function getWarningMessage(warning: ImportWarning) {
    switch (warning.code) {
      case "DESCRIPTION_MISSING":
        return messages.recipe.warnings.descriptionMissing;
      case "STEPS_MAY_BE_INCOMPLETE":
        return messages.recipe.warnings.stepsIncomplete;
      case "INGREDIENT_UNIT_NEEDS_REVIEW":
        return messages.recipe.warnings.ingredientUnitNeedsReview;
      default:
        return warning.message;
    }
  }

  return (
    <main id="recipe-import-main" className="app-shell max-w-6xl">
      <div id="recipe-import-panel" className="surface-panel space-y-6 p-6 sm:p-8">
        <div id="recipe-import-header" className="page-header-bar">
          <div id="recipe-import-header-copy" className="page-header-copy">
            <p id="recipe-import-header-eyebrow" className="page-eyebrow">
              {messages.recipe.importTitle}
            </p>
            <h1 id="recipe-import-title" className="text-2xl font-semibold">
              {messages.recipe.importTitle}
            </h1>
            <p id="recipe-import-header-supporting-text" className="page-supporting-text max-w-3xl">
              {messages.recipe.importSupport}
            </p>
          </div>
          <div id="recipe-import-header-actions" className="flex flex-wrap items-center justify-end gap-3">
            <LocaleSwitcher locale={locale} />
            <Link id="recipe-import-back-link" href="/" className="text-link text-sm">
              {messages.common.backToRecipes}
            </Link>
          </div>
        </div>

        <div id="recipe-import-mode-tabs" className="secondary-tab-strip" role="tablist" aria-label={messages.recipe.importTitle}>
          <button
            id="recipe-import-mode-tab-document"
            type="button"
            role="tab"
            aria-selected={inputMode === "document"}
            aria-controls="recipe-import-source-section"
            data-active={inputMode === "document"}
            className="secondary-tab-strip-item"
            onClick={() => handleModeChange("document")}
          >
            {messages.recipe.importDocumentTab}
          </button>
          {handwrittenEnabled ? (
            <button
              id="recipe-import-mode-tab-handwritten"
              type="button"
              role="tab"
              aria-selected={inputMode === "handwritten"}
              aria-controls="recipe-import-source-section"
              data-active={inputMode === "handwritten"}
              className="secondary-tab-strip-item"
              onClick={() => handleModeChange("handwritten")}
            >
              {messages.recipe.importHandwrittenTab}
            </button>
          ) : null}
        </div>

        {error ? (
          <p
            id="recipe-import-error-message"
            className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        <div id="recipe-import-workspace" className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <section id="recipe-import-source-section" className="surface-card space-y-5 p-5 sm:p-6" role="tabpanel">
            <div id="recipe-import-source-header" className="recipe-form-section-header">
              <div id="recipe-import-source-copy" className="recipe-form-section-copy">
                <p id="recipe-import-source-step-label" className="page-eyebrow">
                  {messages.recipe.sourceStep}
                </p>
                <h2 id="recipe-import-source-title" className="text-lg font-semibold">
                  {messages.recipe.sourceTitle}
                </h2>
              </div>
            </div>

            <form id="recipe-import-parse-form" onSubmit={handleParse} className="space-y-4">
              {inputMode === "handwritten" ? (
                <div id="recipe-import-handwritten-source-panel" className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5">
                  <h3 id="recipe-import-handwritten-upload-title" className="text-xl font-semibold">
                    {messages.recipe.uploadTitle}
                  </h3>
                  <p id="recipe-import-handwritten-upload-copy" className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                    {messages.recipe.uploadCopy}
                  </p>

                  <div id="recipe-import-handwritten-tips-grid" className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      messages.recipe.handwrittenTip1,
                      messages.recipe.handwrittenTip2,
                      messages.recipe.handwrittenTip3,
                      messages.recipe.handwrittenTip4,
                    ].map((tip) => (
                      <div
                        id={`recipe-import-handwritten-tip-${tip.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
                        key={tip}
                        className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text-muted)]"
                      >
                        {tip}
                      </div>
                    ))}
                  </div>

                  <label
                    id="recipe-import-handwritten-files-label"
                    htmlFor="recipe-import-handwritten-files-input"
                    className="mt-5 block text-sm font-medium"
                  >
                    {messages.recipe.uploadField}
                  </label>
                  <input
                    id="recipe-import-handwritten-files-input"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/tiff,image/bmp"
                    className="input-base mt-2"
                    onChange={(event) => setHandwrittenFiles(Array.from(event.target.files ?? []))}
                  />
                  <p
                    id="recipe-import-handwritten-supported-formats"
                    className="mt-2 text-xs text-[var(--color-text-muted)]"
                  >
                    {messages.recipe.uploadFormats}
                  </p>
                </div>
              ) : (
                <>
                  <div id="recipe-import-text-field">
                    <label
                      id="recipe-import-text-label"
                      htmlFor="recipe-import-textarea"
                      className="mb-1 block text-sm font-medium"
                    >
                      {messages.recipe.pasteRecipeText}
                    </label>
                    <textarea
                      id="recipe-import-textarea"
                      value={rawText}
                      onChange={(event) => setRawText(event.target.value)}
                      rows={12}
                      className="input-base"
                      placeholder={messages.recipe.pasteRecipePlaceholder}
                    />
                  </div>

                  <div id="recipe-import-file-field">
                    <label
                      id="recipe-import-file-label"
                      htmlFor="recipe-import-file-input"
                      className="mb-1 block text-sm font-medium"
                    >
                      {messages.recipe.uploadDocumentLabel}
                    </label>
                    <input
                      id="recipe-import-file-input"
                      type="file"
                      accept=".txt,text/plain,.doc,application/msword,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,application/pdf,image/jpeg,image/png,image/webp,image/tiff,image/bmp"
                      onChange={(event) => setSelectedDocumentFile(event.target.files?.[0] ?? null)}
                      className="input-base"
                    />
                  </div>
                </>
              )}

              <button
                id="recipe-import-parse-btn"
                type="submit"
                disabled={!canParse || isParsing}
                className={buttonClassName("primary")}
              >
                {isParsing
                  ? (inputMode === "handwritten" ? messages.recipe.readingHandwriting : messages.recipe.parsingSubmit)
                  : (inputMode === "handwritten" ? messages.recipe.readHandwriting : messages.recipe.parseSubmit)}
              </button>
            </form>

            {inputMode === "handwritten" ? (
              <div id="recipe-import-handwritten-pages-section" className="space-y-3">
                <div id="recipe-import-handwritten-pages-header" className="recipe-form-section-header">
                  <div id="recipe-import-handwritten-pages-copy" className="recipe-form-section-copy">
                    <p id="recipe-import-handwritten-pages-label" className="page-eyebrow">
                      {messages.recipe.orderedUploads}
                    </p>
                    <h3 id="recipe-import-handwritten-pages-title" className="text-base font-semibold">
                      {messages.recipe.uploadedPages}
                    </h3>
                  </div>
                </div>

                {handwrittenFiles.length > 0 ? (
                  <ul id="recipe-import-handwritten-pages-list" className="space-y-3">
                    {handwrittenFiles.map((file, index) => (
                      <li
                        id={`recipe-import-handwritten-page-item-${index + 1}`}
                        key={`${file.name}-${index}`}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <strong id={`recipe-import-handwritten-page-title-${index + 1}`}>{messages.recipe.pageLabel} {index + 1}</strong>
                          <span
                            id={`recipe-import-handwritten-page-order-note-${index + 1}`}
                            className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]"
                          >
                            {messages.recipe.uploadOrderPreserved}
                          </span>
                        </div>
                        <p
                          id={`recipe-import-handwritten-page-file-${index + 1}`}
                          className="mt-2 text-sm text-[var(--color-text-muted)]"
                        >
                          {file.name}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p
                    id="recipe-import-handwritten-pages-empty"
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-6 text-sm text-[var(--color-text-muted)]"
                  >
                    {messages.recipe.uploadedPagesEmpty}
                  </p>
                )}
              </div>
            ) : null}
          </section>

          <section id="recipe-import-review-section" className="surface-card space-y-5 p-5 sm:p-6">
            <div id="recipe-import-review-header" className="recipe-form-section-header">
              <div id="recipe-import-review-copy" className="recipe-form-section-copy">
                <p id="recipe-import-review-step-label" className="page-eyebrow">
                  {messages.recipe.reviewStep}
                </p>
                <h2 id="recipe-import-review-title" className="text-lg font-semibold">
                  {messages.recipe.reviewTitle}
                </h2>
              </div>
            </div>

            {!draft ? (
              <p
                id="recipe-import-review-empty"
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-10 text-sm text-[var(--color-text-muted)]"
              >
                {messages.recipe.reviewEmpty}
              </p>
            ) : (
              <>
                {inputMode === "handwritten" ? (
                  <div
                    id="recipe-import-handwritten-warning-banner"
                    className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800"
                  >
                    <p id="recipe-import-handwritten-warning-title" className="font-medium">
                      {messages.recipe.manualReviewRecommended}
                    </p>
                    <ul id="recipe-import-handwritten-warning-list" className="mt-2 space-y-1">
                      {handwrittenReviewHints.map((hint, index) => (
                        <li id={`recipe-import-handwritten-warning-item-${index + 1}`} key={`${hint}-${index}`}>
                          {hint}
                        </li>
                      ))}
                      {mergedPageNote ? <li id="recipe-import-handwritten-warning-merged-pages">{mergedPageNote}</li> : null}
                    </ul>
                  </div>
                ) : null}

                {draftWarnings.length > 0 ? (
                  <div
                    id="recipe-import-warning-summary"
                    className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800"
                  >
                    <p id="recipe-import-warning-summary-title" className="font-medium">
                      {messages.recipe.reviewDetectedFields}
                    </p>
                    <ul id="recipe-import-warning-summary-list" className="mt-2 space-y-1">
                      {draftWarnings.map((warning, index) => (
                        <li id={`recipe-import-warning-summary-item-${index + 1}`} key={`${warning.code}-${warning.field ?? "global"}`}>
                          {getWarningMessage(warning)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {inputMode === "handwritten" ? (
                  <div
                    id="recipe-import-source-visibility-section"
                    className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-4"
                  >
                    <label
                      id="recipe-import-source-visibility-label"
                      htmlFor="recipe-import-source-visibility-select"
                      className="block text-sm font-medium"
                    >
                      {messages.recipe.sourceImageVisibilityLabel}
                    </label>
                    <p id="recipe-import-source-visibility-copy" className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {messages.recipe.sourceImageVisibilityDescription}
                    </p>
                    <select
                      id="recipe-import-source-visibility-select"
                      value={sourceImageVisibility}
                      onChange={(event) =>
                        setSourceImageVisibility(event.target.value === "public" ? "public" : "private")
                      }
                      className="input-base mt-3"
                    >
                      <option id="recipe-import-source-visibility-option-private" value="private">
                        {messages.recipe.sourceVisibilityPrivate}
                      </option>
                      <option id="recipe-import-source-visibility-option-public" value="public">
                        {messages.recipe.sourceVisibilityPublic}
                      </option>
                    </select>
                  </div>
                ) : null}

                {sourceRefs.length > 0 ? (
                  <div id="recipe-import-source-files-summary" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4">
                    <p id="recipe-import-source-files-summary-title" className="text-sm font-medium">
                      {messages.recipe.importedSourceFiles}
                    </p>
                    <ul id="recipe-import-source-files-summary-list" className="mt-2 space-y-1 text-sm text-[var(--color-text-muted)]">
                      {sourceRefs.map((sourceRef, index) => (
                        <li id={`recipe-import-source-files-summary-item-${index + 1}`} key={`${sourceRef.originalFilename}-${index}`}>
                          {sourceRef.originalFilename}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div id="recipe-import-title-field">
                  <label id="recipe-import-title-label" htmlFor="recipe-import-title-input" className="mb-1 block text-sm font-medium">
                    {messages.recipe.titleLabel}
                  </label>
                  <input
                    id="recipe-import-title-input"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="input-base"
                  />
                </div>

                <div id="recipe-import-description-field">
                  <label id="recipe-import-description-label" htmlFor="recipe-import-description-input" className="mb-1 block text-sm font-medium">
                    {messages.recipe.descriptionLabel}
                  </label>
                  <textarea
                    id="recipe-import-description-input"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={2}
                    className="input-base"
                  />
                  {getWarningsForField("description").map((warning, index) => (
                    <p
                      id={`recipe-import-description-warning-${index + 1}`}
                      key={`${warning.code}-${index}`}
                      className="mt-1 text-sm text-amber-800"
                    >
                      {getWarningMessage(warning)}
                    </p>
                  ))}
                </div>

                <RecipeLanguageControl
                  baseId="recipe-import-language"
                  value={recipeLanguage}
                  onChange={setRecipeLanguage}
                />

                <div id="recipe-import-steps-field">
                  <label id="recipe-import-steps-label" htmlFor="recipe-import-steps-input" className="mb-1 block text-sm font-medium">
                    {messages.recipe.stepsLabel}
                  </label>
                  <textarea
                    id="recipe-import-steps-input"
                    value={stepsMarkdown}
                    onChange={(event) => setStepsMarkdown(event.target.value)}
                    rows={6}
                    className="input-base"
                  />
                  {getWarningsForField("stepsMarkdown").map((warning, index) => (
                    <p
                      id={`recipe-import-steps-warning-${index + 1}`}
                      key={`${warning.code}-${index}`}
                      className="mt-1 text-sm text-amber-800"
                    >
                      {getWarningMessage(warning)}
                    </p>
                  ))}
                </div>

                <div id="recipe-import-ingredients-section" className="space-y-2">
                  <div id="recipe-import-ingredients-header" className="flex items-center justify-between">
                    <h3 id="recipe-import-ingredients-title" className="text-sm font-semibold">
                      {messages.recipe.ingredientsTitle}
                    </h3>
                    <button
                      id="recipe-import-add-ingredient-btn"
                      type="button"
                      onClick={addIngredientRow}
                      className={buttonClassName("secondary")}
                    >
                      {messages.recipe.addIngredient}
                    </button>
                  </div>

                  {ingredients.map((ingredient, ingredientIndex) => (
                    <div
                      id={`recipe-import-ingredient-row-${ingredient.rowId}`}
                      key={ingredient.rowId}
                      className="grid gap-2 rounded-lg border border-[var(--color-border)] p-2 sm:grid-cols-[1.5fr_0.8fr_1fr_1.4fr_auto]"
                    >
                      <div id={`recipe-import-ingredient-name-field-${ingredient.rowId}`}>
                        <input
                          id={`recipe-import-ingredient-name-input-${ingredient.rowId}`}
                          value={ingredient.name}
                          onChange={(event) => updateIngredient(ingredient.rowId, "name", event.target.value)}
                          placeholder={messages.recipe.nameLabel}
                          className="input-base"
                        />
                      </div>
                      <div id={`recipe-import-ingredient-qty-field-${ingredient.rowId}`}>
                        <input
                          id={`recipe-import-ingredient-qty-input-${ingredient.rowId}`}
                          value={ingredient.qty}
                          onChange={(event) => updateIngredient(ingredient.rowId, "qty", event.target.value)}
                          placeholder={messages.recipe.quantityLabel}
                          className="input-base"
                        />
                      </div>
                      <div id={`recipe-import-ingredient-unit-field-${ingredient.rowId}`}>
                        <input
                          id={`recipe-import-ingredient-unit-input-${ingredient.rowId}`}
                          value={ingredient.unit}
                          onChange={(event) => updateIngredient(ingredient.rowId, "unit", event.target.value)}
                          placeholder={messages.recipe.unitLabel}
                          className="input-base"
                        />
                        {getWarningsForIngredientField(ingredientIndex, "unit").map((warning, index) => (
                          <p
                            id={`recipe-import-ingredient-unit-warning-${ingredient.rowId}-${index + 1}`}
                            key={`${warning.code}-${index}`}
                            className="mt-1 text-xs text-[var(--color-text-muted)]"
                          >
                            {getWarningMessage(warning)}
                          </p>
                        ))}
                      </div>
                      <div id={`recipe-import-ingredient-notes-field-${ingredient.rowId}`}>
                        <input
                          id={`recipe-import-ingredient-notes-input-${ingredient.rowId}`}
                          value={ingredient.notes}
                          onChange={(event) => updateIngredient(ingredient.rowId, "notes", event.target.value)}
                          placeholder={messages.recipe.notesLabel}
                          className="input-base"
                        />
                      </div>
                      <button
                        id={`recipe-import-remove-ingredient-btn-${ingredient.rowId}`}
                        type="button"
                        onClick={() => removeIngredientRow(ingredient.rowId)}
                        className={buttonClassName("danger")}
                      >
                        {messages.recipe.remove}
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  id="recipe-import-continue-btn"
                  type="button"
                  onClick={continueToCreate}
                  disabled={isContinuing}
                  className={buttonClassName("primary")}
                >
                  {isContinuing ? messages.recipe.savingSubmit : messages.recipe.continueToForm}
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
