"use client";

type IngredientUnitComboboxProps = {
  id: string;
  listId: string;
  onChange: (value: string) => void;
  required?: boolean;
  suggestions: string[];
  value: string;
};

export function IngredientUnitCombobox({
  id,
  listId,
  onChange,
  required = false,
  suggestions,
  value,
}: IngredientUnitComboboxProps) {
  return (
    <>
      <input
        id={id}
        list={listId}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input-base"
      />
      <datalist id={listId}>
        {suggestions.map((unit) => (
          <option id={`${listId}-option-${toSuggestionIdSegment(unit)}`} key={unit} value={unit} />
        ))}
      </datalist>
    </>
  );
}

function toSuggestionIdSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
