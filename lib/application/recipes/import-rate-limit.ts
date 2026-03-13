import {
  getRecipeImportParseRateLimitMax,
  getRecipeImportParseRateLimitWindowMs,
} from "@/lib/application/recipes/import-config";
import { checkRateLimit } from "@/lib/phase3/rate-limit";

export function checkRecipeImportParseRateLimit(userId: number) {
  return checkRateLimit(
    "recipe-import-parse",
    String(userId),
    getRecipeImportParseRateLimitMax(),
    getRecipeImportParseRateLimitWindowMs(),
  );
}
