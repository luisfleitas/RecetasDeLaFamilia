"use client";

import Link from "next/link";
import { upload } from "@vercel/blob/client";
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
import {
  isAcceptedHandwrittenImageFile,
  resolveRecipeImportFileSelection,
} from "@/lib/application/recipes/import-file-selection";
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
  handwrittenBlobUploadPathPrefix: string;
  handwrittenMaxImageBytes: number;
  handwrittenMaxImageCount: number;
  handwrittenMaxUploadBytes: number;
  handwrittenSourceUploadMode: "blob" | "server";
  defaultSourceImageVisibility?: HandwrittenSourceImageVisibility;
  layoutVariant?: "standalone" | "embedded";
  onImportSucceeded?: (result: ImportRecipeSuccessResult) => void;
};

type StagedSourceImageRef = {
  id: number;
  clientFileId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

export type ImportRecipeSuccessResult = {
  importSessionId: string;
  draft: ImportedRecipeDraft;
  warnings: ImportWarning[];
  sourceRefs: ImportSessionSourceRef[];
  metadata: ImportSessionMetadata | null;
  inputMode: RecipeImportInputMode;
};

type ImportSourceTab = "paste" | "document" | "handwritten";

function toEditableIngredients(draft: ImportedRecipeDraft): IngredientDraft[] {
  return draft.ingredients.map((ingredient, index) => ({
    rowId: index + 1,
    name: ingredient.name,
    qty: ingredient.qty.toString(),
    unit: ingredient.unit,
    notes: ingredient.notes ?? "",
  }));
}

function sanitizeUploadPathSegment(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned.length > 0 ? cleaned : "handwritten-source";
}

function formatFileSize(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1) {
    return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
  }

  return `${Math.ceil(bytes / 1024)} KB`;
}

async function waitForStagedSources(uploadBatchId: string, expectedCount: number): Promise<StagedSourceImageRef[]> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await fetch(
      `/api/recipes/import/source-images?uploadBatchId=${encodeURIComponent(uploadBatchId)}`,
      { cache: "no-store" },
    );
    const data = (await response.json()) as { sources?: StagedSourceImageRef[]; error?: string };
    if (!response.ok || !data.sources) {
      throw new Error(data.error ?? "Could not resolve uploaded source images.");
    }

    if (data.sources.length >= expectedCount) {
      return data.sources;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("Timed out while preparing handwritten source images.");
}

export default function ImportRecipeForm({
  defaultSourceImageVisibility = "private",
  handwrittenBlobUploadPathPrefix,
  handwrittenEnabled,
  handwrittenMaxImageBytes,
  handwrittenMaxImageCount,
  handwrittenMaxUploadBytes,
  handwrittenSourceUploadMode,
  layoutVariant = "standalone",
  onImportSucceeded,
}: ImportRecipeFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const messages = useMessages();
  const [sourceTab, setSourceTab] = useState<ImportSourceTab>(layoutVariant === "embedded" ? "paste" : "document");
  const inputMode: RecipeImportInputMode = sourceTab === "handwritten" ? "handwritten" : "document";
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
    useState<HandwrittenSourceImageVisibility>(defaultSourceImageVisibility);
  const handwrittenUploadBytes = handwrittenFiles.reduce((total, file) => total + file.size, 0);
  const handwrittenUploadTooLarge = handwrittenUploadBytes > handwrittenMaxUploadBytes;
  const handwrittenUploadSizeWarning = handwrittenUploadTooLarge
    ? messages.recipe.uploadTotalTooLarge
        .replace("{selectedSize}", formatFileSize(handwrittenUploadBytes))
        .replace("{maxSize}", formatFileSize(handwrittenMaxUploadBytes))
    : null;

  const canParse = useMemo(() => {
    if (sourceTab === "handwritten") {
      return handwrittenFiles.length > 0 && !handwrittenUploadTooLarge;
    }

    if (sourceTab === "paste") {
      return rawText.trim().length > 0;
    }

    return selectedDocumentFile != null;
  }, [handwrittenFiles.length, handwrittenUploadTooLarge, rawText, selectedDocumentFile, sourceTab]);

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

  function buildReviewedImportDraft(): ImportedRecipeDraft {
    return {
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
  }

  function hasInvalidReviewedImportDraft(payload: ImportedRecipeDraft) {
    return (
      !payload.title ||
      !payload.stepsMarkdown ||
      payload.ingredients.length === 0 ||
      payload.ingredients.some(
        (ingredient) =>
          ingredient.name.length === 0 ||
          ingredient.unit.length === 0 ||
          !Number.isFinite(ingredient.qty) ||
          ingredient.qty <= 0,
      )
    );
  }

  async function updateImportSessionDraft(input: {
    importSessionId: string;
    draft: ImportedRecipeDraft;
    metadata?: {
      handwritten?: {
        sourceImageVisibility: HandwrittenSourceImageVisibility;
      };
    };
  }): Promise<ParseResponse> {
    const response = await fetch(`/api/recipes/import/sessions/${encodeURIComponent(input.importSessionId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        draft: input.draft,
        metadata: input.metadata,
      }),
    });

    const data = (await response.json()) as ParseResponse;
    if (!response.ok) {
      throw new Error(data.error ?? messages.recipe.errors.saveImportedDraftFailed);
    }

    return data;
  }

  function handleModeChange(nextTab: ImportSourceTab) {
    setSourceTab(nextTab);
    setError(null);
    resetParsedState();
    if (nextTab === "paste") {
      setSelectedDocumentFile(null);
      setHandwrittenFiles([]);
    }
    if (nextTab === "document") {
      setRawText("");
      setHandwrittenFiles([]);
    }
    if (nextTab === "handwritten") {
      setRawText("");
      setSelectedDocumentFile(null);
    }
  }

  function handleDocumentFileSelection(files: FileList | null) {
    const selection = resolveRecipeImportFileSelection({
      files: Array.from(files ?? []),
      handwrittenEnabled,
    });

    setError(null);
    resetParsedState();

    if (selection.kind === "empty") {
      setSelectedDocumentFile(null);
      return;
    }

    if (selection.kind === "error") {
      setSelectedDocumentFile(null);
      setError(selection.message);
      return;
    }

    if (selection.kind === "handwritten-images") {
      setRawText("");
      setSelectedDocumentFile(null);
      setHandwrittenFiles(selection.files);
      setSourceTab("handwritten");
      return;
    }

    setSelectedDocumentFile(selection.file);
  }

  function handleHandwrittenFilesChange(files: FileList | null) {
    setError(null);
    resetParsedState();
    setHandwrittenFiles(Array.from(files ?? []));
  }

  async function handleParse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (inputMode === "handwritten" && handwrittenUploadTooLarge) {
      setError(handwrittenUploadSizeWarning ?? messages.recipe.errors.parseRecipeFailed);
      return;
    }

    setIsParsing(true);

    try {
      let response: Response;

      if (inputMode === "handwritten") {
        const handwrittenTotalBytes = handwrittenFiles.reduce((total, file) => total + file.size, 0);
        const oversizedFile = handwrittenFiles.find((file) => file.size > handwrittenMaxImageBytes);
        const unsupportedFile = handwrittenFiles.find((file) => !isAcceptedHandwrittenImageFile(file));
        if (handwrittenFiles.length > handwrittenMaxImageCount) {
          resetParsedState();
          setError(`Upload up to ${handwrittenMaxImageCount} handwritten images per import.`);
          return;
        }
        if (unsupportedFile) {
          resetParsedState();
          setError("Unsupported handwritten file type. Use JPG, PNG, WEBP, TIFF, or BMP.");
          return;
        }
        if (oversizedFile) {
          resetParsedState();
          setError(`Each handwritten image must be ${formatFileSize(handwrittenMaxImageBytes)} or smaller.`);
          return;
        }
        if (handwrittenTotalBytes > handwrittenMaxUploadBytes) {
          resetParsedState();
          setError(`Combined handwritten image uploads must be ${formatFileSize(handwrittenMaxUploadBytes)} or smaller.`);
          return;
        }

        const uploadBatchId = crypto.randomUUID();
        const clientFileIds = handwrittenFiles.map((file, index) => `${index + 1}-${sanitizeUploadPathSegment(file.name)}`);

        if (handwrittenSourceUploadMode === "blob") {
          await Promise.all(
            handwrittenFiles.map((file, index) =>
              upload(
                `${handwrittenBlobUploadPathPrefix}imports/staging/${uploadBatchId}/${clientFileIds[index]}-${sanitizeUploadPathSegment(file.name)}`,
                file,
                {
                  access: "private",
                  clientPayload: JSON.stringify({
                    uploadBatchId,
                    clientFileId: clientFileIds[index],
                    originalFilename: file.name || "handwritten-source",
                    mimeType: file.type || "application/octet-stream",
                    sizeBytes: file.size,
                  }),
                  contentType: file.type || "application/octet-stream",
                  handleUploadUrl: "/api/recipes/import/source-images/upload",
                  multipart: true,
                },
              ),
            ),
          );
        } else {
          for (let index = 0; index < handwrittenFiles.length; index += 1) {
            const file = handwrittenFiles[index];
            const sourceFormData = new FormData();
            sourceFormData.append("uploadBatchId", uploadBatchId);
            sourceFormData.append("clientFileId", clientFileIds[index]);
            sourceFormData.append("image", file);
            const sourceResponse = await fetch("/api/recipes/import/source-images", {
              method: "POST",
              body: sourceFormData,
            });
            if (!sourceResponse.ok) {
              const sourceData = (await sourceResponse.json()) as { error?: string };
              throw new Error(sourceData.error ?? messages.recipe.errors.parseRecipeFailed);
            }
          }
        }

        const stagedSources = await waitForStagedSources(uploadBatchId, handwrittenFiles.length);
        const stagedSourceDocumentIds = clientFileIds.map((clientFileId) => {
          const source = stagedSources.find((item) => item.clientFileId === clientFileId);
          if (!source) {
            throw new Error("Could not resolve uploaded source image order.");
          }

          return source.id;
        });

        response = await fetch("/api/recipes/import/parse", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            inputMode: "handwritten",
            stagedSourceDocumentIds,
          }),
        });
      } else {
        const hasText = sourceTab === "paste" && rawText.trim().length > 0;
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
      const nextSourceImageVisibility =
        data.metadata?.handwritten?.sourceImageVisibility ?? defaultSourceImageVisibility;
      setSourceImageVisibility(nextSourceImageVisibility);
      applyDraft(data.draft);

      if (onImportSucceeded) {
        let successData = data;
        if (inputMode === "handwritten" && nextSourceImageVisibility === "public") {
          successData = await updateImportSessionDraft({
            importSessionId: data.importSessionId,
            draft: data.draft,
            metadata: {
              handwritten: {
                sourceImageVisibility: nextSourceImageVisibility,
              },
            },
          });
        }

        onImportSucceeded({
          importSessionId: data.importSessionId,
          draft: successData.draft ?? data.draft,
          warnings: successData.warnings ?? data.warnings ?? [],
          sourceRefs: successData.sourceRefs ?? data.sourceRefs ?? [],
          metadata: successData.metadata ?? data.metadata ?? null,
          inputMode,
        });
      }
    } catch (parseError) {
      resetParsedState();
      setError(parseError instanceof Error ? parseError.message : messages.recipe.errors.parseRecipeFailed);
    } finally {
      setIsParsing(false);
    }
  }

  async function continueToCreate() {
    if (!draft || !importSessionId) {
      return;
    }

    const payload = buildReviewedImportDraft();

    if (hasInvalidReviewedImportDraft(payload)) {
      setError(messages.recipe.errors.completeDraftFields);
      return;
    }

    setError(null);
    setIsContinuing(true);
    try {
      const data = await updateImportSessionDraft({
        importSessionId,
        draft: payload,
        metadata:
          inputMode === "handwritten"
            ? {
                handwritten: {
                  sourceImageVisibility,
                },
              }
            : undefined,
      });

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

  const isEmbedded = layoutVariant === "embedded";
  const Root = isEmbedded ? "section" : "main";
  const modeTabBaseId = isEmbedded ? "add-recipe-import" : "recipe-import-mode";
  const rootId = isEmbedded ? "add-recipe-import-source-screen" : "recipe-import-main";
  const rootClassName = isEmbedded ? "surface-panel grid gap-5 p-5" : "app-shell max-w-6xl";
  const panelClassName = isEmbedded ? "grid gap-5" : "surface-panel space-y-6 p-6 sm:p-8";

  return (
    <Root id={rootId} className={rootClassName}>
      <div id={isEmbedded ? "add-recipe-import-panel" : "recipe-import-panel"} className={panelClassName}>
        {isEmbedded ? (
          <div id="add-recipe-import-source-copy" className="recipe-form-section-copy">
            <h2 id="add-recipe-import-source-title" className="recipe-form-section-title">
              {messages.recipe.addWorkflowImportSourceTitle}
            </h2>
            <p id="add-recipe-import-source-description" className="recipe-form-section-description">
              {messages.recipe.addWorkflowImportSourceDescription}
            </p>
          </div>
        ) : (
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
        )}

        <div id={isEmbedded ? "add-recipe-import-mode-tabs" : "recipe-import-mode-tabs"} className="secondary-tab-strip" role="tablist" aria-label={messages.recipe.importTitle}>
          {isEmbedded ? (
            <button
              id="add-recipe-import-paste-tab"
              type="button"
              role="tab"
              aria-selected={sourceTab === "paste"}
              aria-controls="recipe-import-source-section"
              data-active={sourceTab === "paste"}
              className="secondary-tab-strip-item"
              onClick={() => handleModeChange("paste")}
            >
              {messages.recipe.pasteRecipeText}
            </button>
          ) : null}
          <button
            id={`${modeTabBaseId}-${isEmbedded ? "document-tab" : "tab-document"}`}
            type="button"
            role="tab"
            aria-selected={isEmbedded ? sourceTab === "document" : inputMode === "document"}
            aria-controls="recipe-import-source-section"
            data-active={isEmbedded ? sourceTab === "document" : inputMode === "document"}
            className="secondary-tab-strip-item"
            onClick={() => handleModeChange(isEmbedded ? "document" : "document")}
          >
            {messages.recipe.importDocumentTab}
          </button>
          {handwrittenEnabled ? (
            <button
              id={`${modeTabBaseId}-${isEmbedded ? "handwritten-tab" : "tab-handwritten"}`}
              type="button"
              role="tab"
              aria-selected={sourceTab === "handwritten"}
              aria-controls="recipe-import-source-section"
              data-active={sourceTab === "handwritten"}
              className="secondary-tab-strip-item"
              onClick={() => handleModeChange("handwritten")}
            >
              {messages.recipe.importHandwrittenTab}
            </button>
          ) : null}
        </div>

        {isEmbedded ? (
          <>
            <p id="add-recipe-import-processing" className={isParsing ? "text-sm text-[var(--color-text-muted)]" : "hidden"}>
              {inputMode === "handwritten" ? messages.recipe.readingHandwriting : messages.recipe.parsingSubmit}
            </p>
            <p id="add-recipe-import-success" className="hidden">
              {messages.recipe.addWorkflowImportSuccess}
            </p>
          </>
        ) : null}

        {error ? (
          <p
            id={isEmbedded ? "add-recipe-import-error" : "recipe-import-error-message"}
            className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        <div
          id="recipe-import-workspace"
          className={isEmbedded ? "grid gap-6" : "grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"}
        >
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
                    onChange={(event) => handleHandwrittenFilesChange(event.target.files)}
                    aria-describedby="recipe-import-handwritten-supported-formats recipe-import-handwritten-upload-size"
                  />
                  <p
                    id="recipe-import-handwritten-supported-formats"
                    className="mt-2 text-xs text-[var(--color-text-muted)]"
                  >
                    {messages.recipe.uploadFormats}
                  </p>
                  <p
                    id="recipe-import-handwritten-upload-size"
                    className={`mt-2 text-xs ${
                      handwrittenUploadTooLarge ? "text-red-700" : "text-[var(--color-text-muted)]"
                    }`}
                    role={handwrittenUploadTooLarge ? "alert" : undefined}
                  >
                    {handwrittenUploadSizeWarning ??
                      messages.recipe.uploadSizeLimit.replace("{maxSize}", formatFileSize(handwrittenMaxUploadBytes))}
                  </p>
                </div>
              ) : (
                <>
                  {!isEmbedded || sourceTab === "paste" ? (
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
                  ) : null}

                  {!isEmbedded || sourceTab === "document" ? (
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
                        multiple
                        accept=".txt,text/plain,.doc,application/msword,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,application/pdf,image/jpeg,image/png,image/webp,image/tiff,image/bmp"
                        onChange={(event) => handleDocumentFileSelection(event.target.files)}
                        className="input-base"
                      />
                    </div>
                  ) : null}
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
                          {file.name} ({formatFileSize(file.size)})
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

          {!isEmbedded ? (
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
          ) : null}
        </div>
      </div>
    </Root>
  );
}
