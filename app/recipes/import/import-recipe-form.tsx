"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import { getImportWarningsForDraft, type ImportWarning } from "@/lib/application/recipes/import-warnings";
import type { ImportedRecipeDraft } from "@/lib/application/recipes/text-document-import";

type ParseResponse = {
  importSessionId?: string;
  draft?: ImportedRecipeDraft;
  warnings?: ImportWarning[];
  error?: string;
};

type IngredientDraft = {
  rowId: number;
  name: string;
  qty: string;
  unit: string;
  notes: string;
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

export default function ImportRecipeForm() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<ImportedRecipeDraft | null>(null);
  const [importSessionId, setImportSessionId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stepsMarkdown, setStepsMarkdown] = useState("");
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  const canParse = useMemo(
    () => rawText.trim().length > 0 || selectedFile != null,
    [rawText, selectedFile],
  );
  const draftWarnings = useMemo<ImportWarning[]>(() => {
    if (!draft) {
      return [];
    }

    return getImportWarningsForDraft({
      title: title.trim(),
      description: description.trim().length > 0 ? description.trim() : null,
      stepsMarkdown: stepsMarkdown.trim(),
      ingredients: ingredients.map((ingredient, index) => ({
        name: ingredient.name.trim(),
        qty: Number(ingredient.qty),
        unit: ingredient.unit.trim(),
        notes: ingredient.notes.trim().length > 0 ? ingredient.notes.trim() : null,
        position: index + 1,
      })),
    });
  }, [description, draft, ingredients, stepsMarkdown, title]);

  function applyDraft(nextDraft: ImportedRecipeDraft) {
    setDraft(nextDraft);
    setTitle(nextDraft.title);
    setDescription(nextDraft.description ?? "");
    setStepsMarkdown(nextDraft.stepsMarkdown);
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

  async function handleParse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsParsing(true);

    try {
      const hasText = rawText.trim().length > 0;
      const response = await fetch("/api/recipes/import/parse", {
        method: "POST",
        ...(hasText
          ? {
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ content: rawText }),
            }
          : (() => {
              const formData = new FormData();
              if (selectedFile) {
                formData.append("file", selectedFile);
              }
              return { body: formData };
            })()),
      });

      const data = (await response.json()) as ParseResponse;

      if (!response.ok || !data.draft || !data.importSessionId) {
        setDraft(null);
        setImportSessionId(null);
        setError(data.error ?? "Could not parse this recipe.");
        return;
      }

      setImportSessionId(data.importSessionId ?? null);
      applyDraft(data.draft);
    } catch {
      setDraft(null);
      setImportSessionId(null);
      setError("Could not parse this recipe.");
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
      setError("Complete title, steps, and ingredient fields before continuing.");
      return;
    }

    setError(null);
    setIsContinuing(true);
    try {
      const response = await fetch(`/api/recipes/import/sessions/${encodeURIComponent(importSessionId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft: payload }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not save imported draft.");
        return;
      }

      router.push(`/recipes/new?importSession=${encodeURIComponent(importSessionId)}`);
    } catch {
      setError("Could not save imported draft.");
    } finally {
      setIsContinuing(false);
    }
  }

  function getWarningsForField(field: string): ImportWarning[] {
    return draftWarnings.filter((warning) => warning.field === field);
  }

  function getWarningsForIngredientField(index: number, field: "name" | "qty" | "unit" | "notes"): ImportWarning[] {
    return getWarningsForField(`ingredients.${index}.` + field);
  }

  return (
    <main id="recipe-import-main" className="app-shell max-w-5xl">
      <div id="recipe-import-panel" className="surface-panel space-y-6 p-6 sm:p-8">
        <div id="recipe-import-header" className="flex items-center justify-between">
          <h1 id="recipe-import-title" className="text-2xl font-semibold">Import Recipe</h1>
          <Link id="recipe-import-back-link" href="/" className="text-link text-sm">
            Back to list
          </Link>
        </div>

        <form id="recipe-import-parse-form" onSubmit={handleParse} className="space-y-4">
          <div id="recipe-import-text-field">
            <label id="recipe-import-text-label" htmlFor="recipe-import-textarea" className="mb-1 block text-sm font-medium">
              Paste recipe text
            </label>
            <textarea
              id="recipe-import-textarea"
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              rows={12}
              className="input-base"
              placeholder="Paste a full recipe text with title, ingredients, and steps."
            />
          </div>

          <div id="recipe-import-file-field">
            <label id="recipe-import-file-label" htmlFor="recipe-import-file-input" className="mb-1 block text-sm font-medium">
              Or upload TXT, DOCX, DOC, PDF, or image document (JPG, PNG, WEBP, TIFF, BMP)
            </label>
            <input
              id="recipe-import-file-input"
              type="file"
              accept=".txt,text/plain,.doc,application/msword,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,application/pdf,image/jpeg,image/png,image/webp,image/tiff,image/bmp"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              className="input-base"
            />
          </div>

          <button
            id="recipe-import-parse-btn"
            type="submit"
            disabled={!canParse || isParsing}
            className={buttonClassName("primary")}
          >
            {isParsing ? "Parsing..." : "Parse recipe"}
          </button>
        </form>

        {error ? (
          <p id="recipe-import-error-message" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {draft ? (
          <section id="recipe-import-preview-section" className="space-y-4 border-t border-[var(--color-border)] pt-4">
            <h2 id="recipe-import-preview-title" className="text-lg font-semibold">Preview and edit</h2>

            {draftWarnings.length > 0 ? (
              <div
                id="recipe-import-warning-summary"
                className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800"
              >
                <p id="recipe-import-warning-summary-title" className="font-medium">
                  Review detected fields before continuing.
                </p>
                <ul id="recipe-import-warning-summary-list" className="mt-2 space-y-1">
                  {draftWarnings.map((warning, index) => (
                    <li id={`recipe-import-warning-summary-item-${index + 1}`} key={`${warning.code}-${warning.field ?? "global"}`}>
                      {warning.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div id="recipe-import-title-field">
              <label id="recipe-import-title-label" htmlFor="recipe-import-title-input" className="mb-1 block text-sm font-medium">
                Title
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
                Description
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
                  {warning.message}
                </p>
              ))}
            </div>

            <div id="recipe-import-steps-field">
              <label id="recipe-import-steps-label" htmlFor="recipe-import-steps-input" className="mb-1 block text-sm font-medium">
                Steps (Markdown)
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
                  {warning.message}
                </p>
              ))}
            </div>

            <div id="recipe-import-ingredients-section" className="space-y-2">
              <div id="recipe-import-ingredients-header" className="flex items-center justify-between">
                <h3 id="recipe-import-ingredients-title" className="text-sm font-semibold">Ingredients</h3>
                <button
                  id="recipe-import-add-ingredient-btn"
                  type="button"
                  onClick={addIngredientRow}
                  className={buttonClassName("secondary")}
                >
                  Add row
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
                      placeholder="Name"
                      className="input-base"
                    />
                  </div>
                  <div id={`recipe-import-ingredient-qty-field-${ingredient.rowId}`}>
                    <input
                      id={`recipe-import-ingredient-qty-input-${ingredient.rowId}`}
                      value={ingredient.qty}
                      onChange={(event) => updateIngredient(ingredient.rowId, "qty", event.target.value)}
                      placeholder="Qty"
                      className="input-base"
                    />
                  </div>
                  <div id={`recipe-import-ingredient-unit-field-${ingredient.rowId}`}>
                    <input
                      id={`recipe-import-ingredient-unit-input-${ingredient.rowId}`}
                      value={ingredient.unit}
                      onChange={(event) => updateIngredient(ingredient.rowId, "unit", event.target.value)}
                      placeholder="Unit"
                      className="input-base"
                    />
                    {getWarningsForIngredientField(ingredientIndex, "unit").map((warning, index) => (
                      <p
                        id={`recipe-import-ingredient-unit-warning-${ingredient.rowId}-${index + 1}`}
                        key={`${warning.code}-${index}`}
                        className="mt-1 text-xs text-[var(--color-text-muted)]"
                      >
                        {warning.message}
                      </p>
                    ))}
                  </div>
                  <div id={`recipe-import-ingredient-notes-field-${ingredient.rowId}`}>
                    <input
                      id={`recipe-import-ingredient-notes-input-${ingredient.rowId}`}
                      value={ingredient.notes}
                      onChange={(event) => updateIngredient(ingredient.rowId, "notes", event.target.value)}
                      placeholder="Notes"
                      className="input-base"
                    />
                  </div>
                  <button
                    id={`recipe-import-remove-ingredient-btn-${ingredient.rowId}`}
                    type="button"
                    onClick={() => removeIngredientRow(ingredient.rowId)}
                    className={buttonClassName("danger")}
                  >
                    Remove
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
              {isContinuing ? "Saving..." : "Continue to recipe form"}
            </button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
