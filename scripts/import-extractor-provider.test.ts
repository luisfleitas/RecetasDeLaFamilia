import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildRecipeImportExtractorProvider,
  parseOpenAiRecipeImportPayload,
} from "../lib/application/recipes/import-extractor-provider";
import {
  getOpenAiRecipeImportModel,
  getRecipeImportExtractorDriver,
} from "../lib/application/recipes/import-config";

test("extractor driver defaults to rule-based", () => {
  const previous = process.env.RECIPE_IMPORT_EXTRACTOR_DRIVER;
  delete process.env.RECIPE_IMPORT_EXTRACTOR_DRIVER;

  try {
    assert.equal(getRecipeImportExtractorDriver(), "rule-based");
  } finally {
    if (previous != null) {
      process.env.RECIPE_IMPORT_EXTRACTOR_DRIVER = previous;
    }
  }
});

test("extractor factory builds rule-based provider", async () => {
  const previous = process.env.RECIPE_IMPORT_EXTRACTOR_DRIVER;
  process.env.RECIPE_IMPORT_EXTRACTOR_DRIVER = "rule-based";

  try {
    const provider = buildRecipeImportExtractorProvider();
    const result = await provider.extract(`
Toast

Ingredients:
- 1 slice bread

Steps:
1. Toast bread.
`);

    assert.equal(result.providerName, "rule-based");
    assert.equal(result.promptVersion, "rule-based-v1");
    assert.equal(result.draft.title, "Toast");
  } finally {
    if (previous == null) {
      delete process.env.RECIPE_IMPORT_EXTRACTOR_DRIVER;
    } else {
      process.env.RECIPE_IMPORT_EXTRACTOR_DRIVER = previous;
    }
  }
});

test("extractor factory rejects unsupported drivers", () => {
  const previous = process.env.RECIPE_IMPORT_EXTRACTOR_DRIVER;
  process.env.RECIPE_IMPORT_EXTRACTOR_DRIVER = "unsupported";

  try {
    assert.throws(
      () => buildRecipeImportExtractorProvider(),
      /Unsupported recipe import extractor driver/,
    );
  } finally {
    if (previous == null) {
      delete process.env.RECIPE_IMPORT_EXTRACTOR_DRIVER;
    } else {
      process.env.RECIPE_IMPORT_EXTRACTOR_DRIVER = previous;
    }
  }
});

test("OpenAI recipe import model falls back to default", () => {
  const previous = process.env.OPENAI_RECIPE_IMPORT_MODEL;
  delete process.env.OPENAI_RECIPE_IMPORT_MODEL;

  try {
    assert.equal(getOpenAiRecipeImportModel(), "gpt-4.1");
  } finally {
    if (previous != null) {
      process.env.OPENAI_RECIPE_IMPORT_MODEL = previous;
    }
  }
});

test("parseOpenAiRecipeImportPayload maps structured output into app draft", () => {
  const draft = parseOpenAiRecipeImportPayload({
    output_text: JSON.stringify({
      title: "Arroz con Pollo",
      description: null,
      stepsMarkdown: "1. Cocinar.",
      ingredients: [
        {
          name: "arroz",
          qty: 2,
          unit: "taza",
          notes: null,
        },
      ],
    }),
  });

  assert.equal(draft.title, "Arroz con Pollo");
  assert.equal(draft.ingredients[0]?.position, 1);
  assert.equal(draft.ingredients[0]?.unit, "taza");
});
