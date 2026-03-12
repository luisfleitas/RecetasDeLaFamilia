export type RecipeImportErrorCode =
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "PDF_NO_EXTRACTABLE_TEXT"
  | "OCR_LOW_CONFIDENCE"
  | "OCR_FALLBACK_FAILED"
  | "DOC_EXTRACTION_FAILED"
  | "MISSING_REQUIRED_FIELDS"
  | "EXTRACTION_TIMEOUT"
  | "PROVIDER_UNAVAILABLE";

export class RecipeImportError extends Error {
  readonly code: RecipeImportErrorCode;
  readonly status: number;

  constructor(code: RecipeImportErrorCode, message: string, status = 400) {
    super(message);
    this.name = "RecipeImportError";
    this.code = code;
    this.status = status;
  }
}

export function toRecipeImportError(error: unknown): RecipeImportError {
  if (error instanceof RecipeImportError) {
    return error;
  }

  const message =
    error instanceof Error ? error.message : "Unexpected parse error while importing recipe.";

  if (message.includes("Unsupported file type")) {
    return new RecipeImportError("UNSUPPORTED_FILE_TYPE", message, 400);
  }

  if (message.includes("exceeds 10MB") || message.includes("exceeds 512KB") || message.includes("Text exceeds")) {
    return new RecipeImportError("FILE_TOO_LARGE", message, 400);
  }

  if (message.includes("PDF does not contain extractable text")) {
    return new RecipeImportError("PDF_NO_EXTRACTABLE_TEXT", message, 400);
  }

  if (message.includes("DOC extraction failed") || message.includes("DOCX extraction failed")) {
    return new RecipeImportError("DOC_EXTRACTION_FAILED", message, 400);
  }

  if (message.includes("OpenAI OCR fallback")) {
    return new RecipeImportError("OCR_FALLBACK_FAILED", message, 400);
  }

  if (message.includes("OpenAI extraction provider") || message.includes("Unsupported recipe import extractor driver")) {
    return new RecipeImportError("PROVIDER_UNAVAILABLE", message, 503);
  }

  if (
    message.includes("content is required") ||
    message.includes("Provide recipe text") ||
    message.includes("Invalid JSON body") ||
    message.includes("Title, ingredients, and steps are required") ||
    message.includes("Imported draft is missing")
  ) {
    return new RecipeImportError("MISSING_REQUIRED_FIELDS", message, 400);
  }

  return new RecipeImportError("MISSING_REQUIRED_FIELDS", message, 400);
}
