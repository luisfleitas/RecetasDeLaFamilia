export type IngredientUnitSuggestionSource = {
  unit: string;
};

export const CANONICAL_INGREDIENT_UNITS = [
  "cup",
  "teaspoon",
  "tablespoon",
  "can",
  "unit",
  "piece",
  "slice",
  "clove",
  "pinch",
  "dash",
  "bunch",
  "sprig",
  "package",
  "box",
  "jar",
  "bottle",
  "bag",
  "stick",
  "pound",
  "ounce",
  "gram",
  "kilogram",
  "milliliter",
  "liter",
  "quart",
  "pint",
  "gallon",
  "fluid ounce",
  "to taste",
  "other",
] as const;

type BuildIngredientUnitSuggestionsInput = {
  ingredients: IngredientUnitSuggestionSource[];
  typedValue: string;
};

export function buildIngredientUnitSuggestions({
  ingredients,
  typedValue,
}: BuildIngredientUnitSuggestionsInput): string[] {
  const normalizedTypedValue = normalizeIngredientUnitKey(typedValue);
  const suggestions = [
    ...CANONICAL_INGREDIENT_UNITS,
    ...ingredients.map((ingredient) => normalizeIngredientUnitKey(ingredient.unit)).filter(Boolean),
  ];
  const dedupedSuggestions = dedupeIngredientUnits(suggestions);

  if (!normalizedTypedValue) {
    return dedupedSuggestions;
  }

  return dedupedSuggestions.filter((unit) => normalizeIngredientUnitKey(unit).includes(normalizedTypedValue));
}

export function isTypedIngredientUnitAllowed(value: string): boolean {
  return value.trim().length > 0;
}

function dedupeIngredientUnits(units: string[]): string[] {
  const seen = new Set<string>();
  const dedupedUnits: string[] = [];

  for (const unit of units) {
    const normalizedUnit = unit.trim();
    const key = normalizeIngredientUnitKey(normalizedUnit);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    dedupedUnits.push(normalizedUnit);
  }

  return dedupedUnits;
}

function normalizeIngredientUnitKey(value: string): string {
  return value.trim().toLocaleLowerCase();
}
