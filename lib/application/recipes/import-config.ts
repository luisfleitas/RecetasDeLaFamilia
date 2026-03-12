const DEFAULT_RECIPE_IMPORT_PARSE_TIMEOUT_MS = 30000;
const DEFAULT_RECIPE_IMPORT_PARSE_RATE_LIMIT_MAX = 10;
const DEFAULT_RECIPE_IMPORT_PARSE_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD = 0.8;
const DEFAULT_RECIPE_IMPORT_OCR_OPENAI_MODEL = "gpt-4.1-mini";
const DEFAULT_RECIPE_IMPORT_EXTRACTOR_DRIVER = "rule-based";
const DEFAULT_OPENAI_RECIPE_IMPORT_MODEL = "gpt-4.1";

function isEnabledFlag(raw: string | undefined): boolean {
  if (raw == null) {
    return false;
  }

  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function isRecipeImportEnabled(): boolean {
  const raw = process.env.RECIPE_IMPORT_ENABLED;

  if (raw == null) {
    return true;
  }

  return isEnabledFlag(raw);
}

export function getRecipeImportParseTimeoutMs(): number {
  const raw = Number(process.env.RECIPE_IMPORT_PARSE_TIMEOUT_MS ?? DEFAULT_RECIPE_IMPORT_PARSE_TIMEOUT_MS);

  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_RECIPE_IMPORT_PARSE_TIMEOUT_MS;
  }

  return Math.floor(raw);
}

export function getRecipeImportParseRateLimitMax(): number {
  const raw = Number(
    process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_MAX ?? DEFAULT_RECIPE_IMPORT_PARSE_RATE_LIMIT_MAX,
  );

  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_RECIPE_IMPORT_PARSE_RATE_LIMIT_MAX;
  }

  return Math.floor(raw);
}

export function getRecipeImportParseRateLimitWindowMs(): number {
  const raw = Number(
    process.env.RECIPE_IMPORT_PARSE_RATE_LIMIT_WINDOW_MS ?? DEFAULT_RECIPE_IMPORT_PARSE_RATE_LIMIT_WINDOW_MS,
  );

  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_RECIPE_IMPORT_PARSE_RATE_LIMIT_WINDOW_MS;
  }

  return Math.floor(raw);
}

export function getRecipeImportOcrConfidenceThreshold(): number {
  const raw = Number(
    process.env.RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD ?? DEFAULT_RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD,
  );

  if (!Number.isFinite(raw) || raw <= 0 || raw > 1) {
    return DEFAULT_RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD;
  }

  return raw;
}

export function getRecipeImportOcrOpenAiModel(): string {
  const raw = process.env.RECIPE_IMPORT_OCR_OPENAI_MODEL?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_RECIPE_IMPORT_OCR_OPENAI_MODEL;
}

export function shouldForceRecipeImportOpenAiOcr(): boolean {
  return isEnabledFlag(process.env.RECIPE_IMPORT_FORCE_OPENAI_OCR);
}

export function hasRecipeImportOpenAiOcrFallback(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getRecipeImportExtractorDriver(): string {
  const raw = process.env.RECIPE_IMPORT_EXTRACTOR_DRIVER?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_RECIPE_IMPORT_EXTRACTOR_DRIVER;
}

export function getOpenAiRecipeImportModel(): string {
  const raw = process.env.OPENAI_RECIPE_IMPORT_MODEL?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_OPENAI_RECIPE_IMPORT_MODEL;
}
