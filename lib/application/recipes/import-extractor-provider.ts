import {
  getOpenAiRecipeImportModel,
  getRecipeImportExtractorDriver,
} from "@/lib/application/recipes/import-config";
import { inferRecipeLanguageFromText } from "@/lib/application/recipes/recipe-language";
import { importRecipeFromTextDocument, type ImportedRecipeDraft } from "@/lib/application/recipes/text-document-import";
import { normalizeRecipeLanguage } from "@/lib/domain/recipe-language";

export type RecipeImportExtractorResult = {
  draft: ImportedRecipeDraft;
  providerName: string;
  providerModel: string | null;
  promptVersion: string | null;
};

export interface RecipeImportExtractorProvider {
  extract(inputText: string): Promise<RecipeImportExtractorResult>;
}

type OpenAiResponsePayload = {
  output_text?: unknown;
  usage?: {
    input_tokens?: unknown;
    output_tokens?: unknown;
    total_tokens?: unknown;
  };
};

const OPENAI_RECIPE_IMPORT_PROMPT_VERSION = "openai-recipe-import-v1";

const IMPORT_DRAFT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "stepsMarkdown", "language", "ingredients"],
  properties: {
    title: { type: "string" },
    description: { type: ["string", "null"] },
    stepsMarkdown: { type: "string" },
    language: { type: "string", enum: ["en", "es"] },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "qty", "unit", "notes"],
        properties: {
          name: { type: "string" },
          qty: { type: "number" },
          unit: { type: "string" },
          notes: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const typed = payload as {
    error?: {
      message?: unknown;
    };
  };

  return typeof typed.error?.message === "string" ? typed.error.message : null;
}

export function parseOpenAiRecipeImportPayload(payload: OpenAiResponsePayload): ImportedRecipeDraft {
  const outputText = typeof payload.output_text === "string" ? payload.output_text.trim() : "";
  if (!outputText) {
    throw new Error("OpenAI extraction provider did not return structured output.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error("OpenAI extraction provider returned invalid JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("OpenAI extraction provider returned invalid recipe draft.");
  }

  const draft = parsed as Partial<ImportedRecipeDraft>;
  const title = typeof draft.title === "string" ? draft.title.trim() : "";
  const description =
    draft.description == null
      ? null
      : typeof draft.description === "string"
        ? draft.description.trim() || null
        : null;
  const stepsMarkdown = typeof draft.stepsMarkdown === "string" ? draft.stepsMarkdown.trim() : "";
  const language = normalizeRecipeLanguage(draft.language, inferRecipeLanguageFromText(outputText));
  const ingredientsRaw = Array.isArray(draft.ingredients) ? draft.ingredients : [];

  return {
    title,
    description,
    stepsMarkdown,
    language,
    ingredients: ingredientsRaw.map((ingredient, index) => {
      const typed = ingredient as {
        name?: unknown;
        qty?: unknown;
        unit?: unknown;
        notes?: unknown;
      };

      return {
        name: typeof typed.name === "string" ? typed.name.trim() : "",
        qty: typeof typed.qty === "number" ? typed.qty : Number(typed.qty),
        unit: typeof typed.unit === "string" ? typed.unit.trim() : "",
        notes:
          typed.notes == null
            ? null
            : typeof typed.notes === "string"
              ? typed.notes.trim() || null
              : null,
        position: index + 1,
      };
    }),
  };
}

class RuleBasedRecipeImportExtractorProvider implements RecipeImportExtractorProvider {
  async extract(inputText: string): Promise<RecipeImportExtractorResult> {
    return {
      draft: importRecipeFromTextDocument(inputText),
      providerName: "rule-based",
      providerModel: null,
      promptVersion: "rule-based-v1",
    };
  }
}

class OpenAiRecipeImportExtractorProvider implements RecipeImportExtractorProvider {
  async extract(inputText: string): Promise<RecipeImportExtractorResult> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OpenAI extraction provider is not configured.");
    }

    const model = getOpenAiRecipeImportModel();
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions:
          "Extract a structured recipe draft from the provided text. Return only recipe data that matches the schema exactly. Preserve the recipe language. Use null when description or notes are absent. Do not invent quantities or units unless strongly implied by the source text.",
        input: inputText,
        text: {
          format: {
            type: "json_schema",
            name: "recipe_import_draft",
            strict: true,
            schema: IMPORT_DRAFT_JSON_SCHEMA,
          },
        },
      }),
    });

    const payload = (await response.json()) as OpenAiResponsePayload;
    if (!response.ok) {
      const message = extractErrorMessage(payload) ?? "OpenAI extraction provider request failed.";
      throw new Error(message);
    }

    return {
      draft: parseOpenAiRecipeImportPayload(payload),
      providerName: "openai",
      providerModel: model,
      promptVersion: OPENAI_RECIPE_IMPORT_PROMPT_VERSION,
    };
  }
}

export function buildRecipeImportExtractorProvider(): RecipeImportExtractorProvider {
  const driver = getRecipeImportExtractorDriver().toLowerCase();

  if (driver === "rule-based") {
    return new RuleBasedRecipeImportExtractorProvider();
  }

  if (driver === "openai") {
    return new OpenAiRecipeImportExtractorProvider();
  }

  throw new Error(`Unsupported recipe import extractor driver: ${driver}`);
}
