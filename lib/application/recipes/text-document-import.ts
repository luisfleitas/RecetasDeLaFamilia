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
  { name: "title", pattern: /^(title|recipe title|nombre|nombre de receta)\s*:?\s*$/i },
  { name: "description", pattern: /^(description|summary|resumen|descripcion|descripci[oó]n)\s*:?\s*$/i },
  {
    name: "ingredients",
    pattern: /^(ingredients|ingredient list|ingredientes)\s*:?\s*$/i,
  },
  {
    name: "steps",
    pattern: /^(steps|instructions|directions|method|pasos|preparaci[oó]n|preparacion)\s*:?\s*$/i,
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
  "kilo",
  "kilos",
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

const UNIT_CANONICAL_MAP: Record<string, string> = {
  cups: "cup",
  grams: "gram",
  kilos: "kilo",
  lbs: "lb",
  pieces: "piece",
  slices: "slice",
  tablespoons: "tablespoon",
  teaspoons: "teaspoon",
  tazas: "taza",
  unidades: "unidad",
};

const INGREDIENT_PREFIX_WORDS = new Set(["de", "del", "la", "el", "los", "las", "of"]);

function canonicalizeUnit(rawUnit: string): string {
  const normalized = rawUnit.trim().toLowerCase();
  return UNIT_CANONICAL_MAP[normalized] ?? normalized;
}

function cleanIngredientName(rawName: string): string {
  const normalized = rawName
    .replace(/[?!.,;:]+$/g, "")
    .trim();

  if (!normalized) {
    return "";
  }

  const tokens = normalized.split(/\s+/);
  const trimmedPrefixTokens = [...tokens];

  while (trimmedPrefixTokens.length > 0 && INGREDIENT_PREFIX_WORDS.has(trimmedPrefixTokens[0].toLowerCase())) {
    trimmedPrefixTokens.shift();
  }

  let name = trimmedPrefixTokens.join(" ").trim();
  name = name.replace(/\s+del\s+buen[oa]s?[.?!,:;]*$/i, "").trim();
  name = name.replace(/[?!.,;:]+$/g, "").trim();
  return name;
}

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
    unit = canonicalizeUnit(tokens[0]);
    nameTokens = tokens.slice(1);
  }

  const name = cleanIngredientName(nameTokens.join(" ").trim());
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

function isLikelyIngredientBullet(rawLine: string): boolean {
  const trimmed = rawLine.trim();
  if (!/^[-*•]\s*/.test(trimmed)) {
    return false;
  }

  // Reduce false-positives from long narrative bullet points.
  const tokenCount = normalizeLine(trimmed).split(/\s+/).filter(Boolean).length;
  return tokenCount > 0 && tokenCount <= 16;
}

function formatStepsMarkdown(rawStepLines: string[]): string {
  const lines = rawStepLines.map((line) => normalizeLine(line)).filter((line) => line.length > 0);

  if (lines.length === 0) {
    return "";
  }

  return lines.map((line, index) => `${index + 1}. ${line}`).join("\n");
}

const STEP_INGREDIENT_CLAUSE_PATTERNS = [
  /^(?:add|mix in|combine|stir in|fold in|season with|top with)\s+([^.;:]+)/i,
  /^(?:agrega|agregue|mezcla|incorpora|a[nñ]ade)\s+([^.;:]+)/i,
];

const STEP_INGREDIENT_SPLIT_PATTERN = /\s+(?:and|y)\s+|,\s*/i;
const STEP_INGREDIENT_STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "el",
  "la",
  "los",
  "las",
  "de",
  "del",
  "al",
]);

function cleanIngredientPhrase(rawPhrase: string): string {
  const collapsed = rawPhrase
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(?:to taste|al gusto)\b/g, "")
    .replace(/[?!.;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!collapsed) {
    return "";
  }

  // Remove leading "with" fragments and trailing narrative tails.
  const withoutJoiners = collapsed.replace(/^(with|con)\s+/, "").split(/\b(?:until|para|for)\b/i)[0]?.trim() ?? "";
  if (!withoutJoiners) {
    return "";
  }

  const maybeIngredient = parseIngredientLine(withoutJoiners, 1);
  if (!maybeIngredient) {
    return "";
  }

  const normalizedName = maybeIngredient.name
    .replace(/\s+(?:en|in)\s+.+$/i, "")
    .replace(/\s+\w{4,}mente$/i, "")
    .trim();
  const words = normalizedName.split(/\s+/).filter(Boolean);
  while (words.length > 0 && STEP_INGREDIENT_STOP_WORDS.has(words[0].toLowerCase())) {
    words.shift();
  }

  return words.join(" ").trim();
}

function inferIngredientsFromStepLines(stepLines: string[]): CreateIngredientInput[] {
  const inferred: CreateIngredientInput[] = [];
  const seen = new Set<string>();

  for (const rawLine of stepLines) {
    const line = normalizeLine(rawLine);
    if (!line) {
      continue;
    }

    for (const pattern of STEP_INGREDIENT_CLAUSE_PATTERNS) {
      const match = line.match(pattern);
      if (!match) {
        continue;
      }

      const clause = match[1]?.trim() ?? "";
      const rawPhrases = clause
        .split(STEP_INGREDIENT_SPLIT_PATTERN)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      let carriedQty: number | null = null;
      let carriedUnit: string | null = null;
      for (const rawPhrase of rawPhrases) {
        const cleanedPhrase = cleanIngredientPhrase(rawPhrase);
        if (!cleanedPhrase) {
          continue;
        }

        const parsed =
          parseIngredientLine(rawPhrase, inferred.length + 1) ??
          parseIngredientLine(cleanedPhrase, inferred.length + 1);
        if (!parsed) {
          continue;
        }
        const normalizedName = cleanIngredientPhrase(parsed.name);
        if (!normalizedName) {
          continue;
        }
        parsed.name = normalizedName;

        const hasExplicitQty = parseLeadingQuantity(rawPhrase).qty != null;
        if (hasExplicitQty) {
          carriedQty = parsed.qty;
          carriedUnit = parsed.unit;
        } else if (
          carriedQty != null &&
          carriedUnit != null &&
          parsed.qty === 1 &&
          parsed.unit === DEFAULT_UNIT
        ) {
          parsed.qty = carriedQty;
          parsed.unit = carriedUnit;
        }

        const key = parsed.name.toLowerCase();
        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        inferred.push({ ...parsed, notes: null, position: inferred.length + 1 });
      }
    }
  }

  return inferred;
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

    // Tolerant mode: if ingredients header is missing, treat a bullet block after title as ingredients.
    if (
      section == null &&
      consumedFirstNonEmptyAsTitle &&
      buckets.ingredients.length === 0 &&
      isLikelyIngredientBullet(rawLine)
    ) {
      section = "ingredients";
      buckets.ingredients.push(line);
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

  const parsedIngredientBullets = buckets.ingredients
    .map((line, index) => parseIngredientLine(line, index + 1))
    .filter((item): item is CreateIngredientInput => item != null);
  const ingredients =
    parsedIngredientBullets.length > 0
      ? parsedIngredientBullets
      : inferIngredientsFromStepLines(buckets.steps);

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
