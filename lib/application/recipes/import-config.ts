const DEFAULT_RECIPE_IMPORT_PARSE_TIMEOUT_MS = 30000;
const DEFAULT_RECIPE_IMPORT_PARSE_RATE_LIMIT_MAX = 10;
const DEFAULT_RECIPE_IMPORT_PARSE_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

export function isRecipeImportEnabled(): boolean {
  const raw = process.env.RECIPE_IMPORT_ENABLED;

  if (raw == null) {
    return true;
  }

  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
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
