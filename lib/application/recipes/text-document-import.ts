import type { CreateIngredientInput } from "@/lib/domain/recipe";

export type ImportedRecipeDraft = {
  title: string;
  description: string | null;
  stepsMarkdown: string;
  ingredients: CreateIngredientInput[];
};

type SectionName = "title" | "description" | "ingredients" | "steps" | null;

const DEFAULT_UNIT = "unit";

const SECTION_MATCHERS: Array<{ name: Exclude<SectionName, null>; pattern: RegExp }> = [
  { name: "title", pattern: /^(title|recipe title|nombre|nombre de receta)\s*:$/i },
  { name: "description", pattern: /^(description|summary|resumen|descripcion|descripci[oó]n)\s*:$/i },
  {
    name: "ingredients",
    pattern: /^(ingredients|ingredient list|ingredientes)\s*:$/i,
  },
  {
    name: "steps",
    pattern: /^(steps|instructions|directions|method|pasos|preparaci[oó]n|preparacion)\s*:$/i,
  },
];

const INLINE_LABEL_MATCHERS: Array<{
  name: Exclude<SectionName, null>;
  pattern: RegExp;
}> = [
  { name: "title", pattern: /^(title|recipe title|nombre|nombre de receta)\s*:\s*(.+)$/i },
  {
    name: "description",
    pattern: /^(description|summary|resumen|descripcion|descripci[oó]n)\s*:\s*(.+)$/i,
  },
];

const COMMON_UNITS = new Set([
  "g",
  "gram",
  "grams",
  "gr",
  "kg",
  "ml",
  "l",
  "cup",
  "cups",
  "tbsp",
  "tablespoon",
  "tablespoons",
  "tsp",
  "teaspoon",
  "teaspoons",
  "oz",
  "lb",
  "lbs",
  "pinch",
  "clove",
  "cloves",
  "slice",
  "slices",
  "can",
  "cans",
  "piece",
  "pieces",
  "unidad",
  "unidades",
  "cucharada",
  "cucharadas",
  "cucharadita",
  "cucharaditas",
  "taza",
  "tazas",
]);

function normalizeLine(line: string): string {
  return line.trim().replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "");
}

function parseLeadingQuantity(text: string): { qty: number | null; rest: string } {
  const mixedFractionMatch = text.match(/^(\d+)\s+(\d+)\/(\d+)\s+(.+)$/);
  if (mixedFractionMatch) {
    const whole = Number(mixedFractionMatch[1]);
    const numerator = Number(mixedFractionMatch[2]);
    const denominator = Number(mixedFractionMatch[3]);

    if (denominator > 0) {
      return {
        qty: whole + numerator / denominator,
        rest: mixedFractionMatch[4].trim(),
      };
    }
  }

  const fractionMatch = text.match(/^(\d+)\/(\d+)\s+(.+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);

    if (denominator > 0) {
      return {
        qty: numerator / denominator,
        rest: fractionMatch[3].trim(),
      };
    }
  }

  const numberMatch = text.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (numberMatch) {
    return {
      qty: Number(numberMatch[1].replace(",", ".")),
      rest: numberMatch[2].trim(),
    };
  }

  return { qty: null, rest: text.trim() };
}

function parseIngredientLine(line: string, position: number): CreateIngredientInput | null {
  const cleaned = normalizeLine(line);
  if (!cleaned) {
    return null;
  }

  const { qty, rest } = parseLeadingQuantity(cleaned);
  if (!rest) {
    return null;
  }

  const noteSplit = rest.split(/\s+-\s+|,\s*/);
  const nameAndUnit = noteSplit[0]?.trim() ?? "";
  const notes = noteSplit.length > 1 ? noteSplit.slice(1).join(", ").trim() : null;

  if (!nameAndUnit) {
    return null;
  }

  const tokens = nameAndUnit.split(/\s+/);
  const firstToken = (tokens[0] ?? "").toLowerCase();

  let unit = DEFAULT_UNIT;
  let nameTokens = tokens;

  if (COMMON_UNITS.has(firstToken) && tokens.length > 1) {
    unit = tokens[0];
    nameTokens = tokens.slice(1);
  }

  const name = nameTokens.join(" ").trim();
  if (!name) {
    return null;
  }

  return {
    name,
    qty: qty ?? 1,
    unit,
    notes: notes && notes.length > 0 ? notes : null,
    position,
  };
}

function formatStepsMarkdown(rawStepLines: string[]): string {
  const lines = rawStepLines.map((line) => normalizeLine(line)).filter((line) => line.length > 0);

  if (lines.length === 0) {
    return "";
  }

  return lines.map((line, index) => `${index + 1}. ${line}`).join("\n");
}

export function importRecipeFromTextDocument(content: string): ImportedRecipeDraft {
  const normalized = content.replace(/\r\n?/g, "\n").trim();

  if (normalized.length === 0) {
    throw new Error("Document is empty.");
  }

  const lines = normalized.split("\n").map((line) => line.trimEnd());

  const buckets: Record<Exclude<SectionName, null>, string[]> = {
    title: [],
    description: [],
    ingredients: [],
    steps: [],
  };

  let section: SectionName = null;
  let consumedFirstNonEmptyAsTitle = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.length === 0) {
      if (section === "description" || section === "steps") {
        buckets[section].push("");
      }
      continue;
    }

    let handledInlineLabel = false;
    for (const matcher of INLINE_LABEL_MATCHERS) {
      const match = line.match(matcher.pattern);
      if (match) {
        buckets[matcher.name].push(match[2].trim());
        section = matcher.name;
        handledInlineLabel = true;
        break;
      }
    }

    if (handledInlineLabel) {
      continue;
    }

    const matchedSection = SECTION_MATCHERS.find((matcher) => matcher.pattern.test(line));
    if (matchedSection) {
      section = matchedSection.name;
      continue;
    }

    if (!consumedFirstNonEmptyAsTitle && section == null) {
      buckets.title.push(line);
      consumedFirstNonEmptyAsTitle = true;
      continue;
    }

    if (section) {
      buckets[section].push(line);
      continue;
    }

    buckets.description.push(line);
  }

  const title = buckets.title.join(" ").trim();
  const description = buckets.description.join(" ").trim();

  const ingredients = buckets.ingredients
    .map((line, index) => parseIngredientLine(line, index + 1))
    .filter((item): item is CreateIngredientInput => item != null);

  const stepsMarkdown = formatStepsMarkdown(buckets.steps);

  if (!title) {
    throw new Error("Could not identify a recipe title.");
  }

  if (ingredients.length === 0) {
    throw new Error("Could not identify ingredients in the document.");
  }

  if (!stepsMarkdown) {
    throw new Error("Could not identify preparation steps in the document.");
  }

  return {
    title,
    description: description.length > 0 ? description : null,
    stepsMarkdown,
    ingredients,
  };
}
