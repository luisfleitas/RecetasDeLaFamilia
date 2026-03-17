"use client";

type IngredientDraft = {
  rowId: number;
  name: string;
  qty: string;
  unit: string;
  notes: string;
};

type IngredientEditorProps = {
  addButtonId: string;
  baseId: string;
  ingredients: IngredientDraft[];
  onAdd: () => void;
  onRemove: (rowId: number) => void;
  onUpdate: (rowId: number, field: keyof Omit<IngredientDraft, "rowId">, value: string) => void;
  title: string;
};

export function IngredientEditor({
  addButtonId,
  baseId,
  ingredients,
  onAdd,
  onRemove,
  onUpdate,
  title,
}: IngredientEditorProps) {
  return (
    <div id={`${baseId}-section`} className="surface-card recipe-form-section p-4">
      <div id={`${baseId}-header`} className="recipe-form-section-header">
        <div id={`${baseId}-copy`} className="recipe-form-section-copy">
          <p id={`${baseId}-title`} className="recipe-form-section-title">{title}</p>
          <p id={`${baseId}-description`} className="recipe-form-section-description">
            Keep the ingredient list easy to scan, easy to edit, and easy to use on smaller screens.
          </p>
        </div>
        <button id={addButtonId} type="button" onClick={onAdd} className="min-w-[10rem]">
          <span className="sr-only">Add ingredient row</span>
          <span className="inline-flex w-full items-center justify-center rounded-[11px] border border-[var(--color-border-strong)] bg-[var(--color-surface-soft)] px-4 py-2.5 text-[15px] font-bold leading-none text-[var(--color-text)] transition-colors duration-150 hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]">
            Add Ingredient
          </span>
        </button>
      </div>

      <div id={`${baseId}-list`} className="ingredient-editor-list">
        {ingredients.map((ingredient, index) => (
          <div id={`${baseId}-row-${ingredient.rowId}`} key={ingredient.rowId} className="ingredient-editor-row">
            <div id={`${baseId}-row-header-${ingredient.rowId}`} className="ingredient-editor-row-header">
              <p id={`${baseId}-row-title-${ingredient.rowId}`} className="ingredient-editor-row-title">
                Ingredient {index + 1}
              </p>
              <button
                id={`${baseId}-remove-${ingredient.rowId}`}
                type="button"
                onClick={() => onRemove(ingredient.rowId)}
                disabled={ingredients.length === 1}
                className="inline-flex items-center justify-center rounded-[11px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-sm font-bold text-[var(--color-text)] transition-colors duration-150 hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Remove
              </button>
            </div>

            <div id={`${baseId}-name-field-${ingredient.rowId}`} className="field">
              <label id={`${baseId}-name-label-${ingredient.rowId}`} htmlFor={`${baseId}-name-input-${ingredient.rowId}`} className="mb-1 block text-sm font-medium">
                Name
              </label>
              <input
                id={`${baseId}-name-input-${ingredient.rowId}`}
                required
                value={ingredient.name}
                onChange={(event) => onUpdate(ingredient.rowId, "name", event.target.value)}
                className="input-base"
              />
            </div>

            <div id={`${baseId}-primary-grid-${ingredient.rowId}`} className="ingredient-editor-grid">
              <div id={`${baseId}-qty-field-${ingredient.rowId}`} className="field">
                <label id={`${baseId}-qty-label-${ingredient.rowId}`} htmlFor={`${baseId}-qty-input-${ingredient.rowId}`} className="mb-1 block text-sm font-medium">
                  Quantity
                </label>
                <input
                  id={`${baseId}-qty-input-${ingredient.rowId}`}
                  type="number"
                  min={0.001}
                  step={0.001}
                  required
                  value={ingredient.qty}
                  onChange={(event) => onUpdate(ingredient.rowId, "qty", event.target.value)}
                  className="input-base"
                />
              </div>

              <div id={`${baseId}-unit-field-${ingredient.rowId}`} className="field">
                <label id={`${baseId}-unit-label-${ingredient.rowId}`} htmlFor={`${baseId}-unit-input-${ingredient.rowId}`} className="mb-1 block text-sm font-medium">
                  Unit
                </label>
                <input
                  id={`${baseId}-unit-input-${ingredient.rowId}`}
                  required
                  value={ingredient.unit}
                  onChange={(event) => onUpdate(ingredient.rowId, "unit", event.target.value)}
                  className="input-base"
                />
              </div>

              <div id={`${baseId}-notes-field-${ingredient.rowId}`} className="field">
                <label id={`${baseId}-notes-label-${ingredient.rowId}`} htmlFor={`${baseId}-notes-input-${ingredient.rowId}`} className="mb-1 block text-sm font-medium">
                  Notes
                </label>
                <input
                  id={`${baseId}-notes-input-${ingredient.rowId}`}
                  value={ingredient.notes}
                  onChange={(event) => onUpdate(ingredient.rowId, "notes", event.target.value)}
                  className="input-base"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div id={`${baseId}-add-row`} className="ingredient-editor-add-row">
        <button
          id={`${baseId}-add-another`}
          type="button"
          onClick={onAdd}
          className="inline-flex items-center justify-center rounded-[11px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-soft)] px-4 py-2.5 text-sm font-bold text-[var(--color-primary)] transition-colors duration-150 hover:bg-[var(--color-surface-muted)]"
        >
          Add Another Ingredient
        </button>
      </div>
    </div>
  );
}
