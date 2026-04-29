import {
  getRecipeImportHandwrittenMaxImageCount,
  getRecipeImportHandwrittenPrimaryOcrProvider,
  hasRecipeImportOpenAiOcrFallback,
} from "@/lib/application/recipes/import-config";
import { inferRecipeLanguageFromText } from "@/lib/application/recipes/recipe-language";
import { extractTextWithLocalOcrResult, isSupportedOcrMimeType } from "@/lib/application/recipes/local-ocr";
import { runOpenAiOcrFallback, shouldUseOpenAiOcrFallback } from "@/lib/application/recipes/openai-ocr";
import type { HandwrittenImportMetadata } from "@/lib/application/recipes/import-session-metadata";
import type { ImportSourceType } from "@/lib/application/recipes/source-documents";
import type { ImportedRecipeDraft } from "@/lib/application/recipes/text-document-import";

export type HandwrittenImportSourceDocument = {
  bytes: Buffer;
  sourceType: ImportSourceType;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

export type HandwrittenImportParseResult = {
  content: string;
  sourceType: "image";
  ocrDriver: "local" | "openai";
  sourceDocuments: HandwrittenImportSourceDocument[];
  metadata: HandwrittenImportMetadata;
};

type HandwrittenOcrPageResult = {
  text: string;
  provider: "local" | "openai";
  filename: string;
  usedFallback: boolean;
  lowConfidence: boolean;
  sparseText: boolean;
};

async function runHandwrittenOcrForFile(file: File, bytes: Buffer): Promise<HandwrittenOcrPageResult> {
  const preferredProvider = getRecipeImportHandwrittenPrimaryOcrProvider();
  const filename = file.name || "handwritten-page";

  if (preferredProvider === "openai") {
    if (!hasRecipeImportOpenAiOcrFallback()) {
      throw new Error("Handwritten OCR requires OpenAI credentials when OpenAI is the selected provider.");
    }

    const result = await runOpenAiOcrFallback({
      bytes,
      mimeType: file.type,
    });

    return {
      text: result.text,
      provider: "openai",
      filename,
      usedFallback: false,
      lowConfidence: false,
      sparseText: isSparseHandwrittenText(result.text),
    };
  }

  try {
    const localResult = await extractTextWithLocalOcrResult({
      bytes,
      mimeType: file.type,
    });

    if (shouldUseOpenAiOcrFallback(localResult.confidence) && hasRecipeImportOpenAiOcrFallback()) {
      const fallbackResult = await runOpenAiOcrFallback({
        bytes,
        mimeType: file.type,
      });

      return {
        text: fallbackResult.text,
        provider: "openai",
        filename,
        usedFallback: true,
        lowConfidence: true,
        sparseText: isSparseHandwrittenText(fallbackResult.text),
      };
    }

    return {
      text: localResult.text,
      provider: "local",
      filename,
      usedFallback: false,
      lowConfidence: shouldUseOpenAiOcrFallback(localResult.confidence),
      sparseText: isSparseHandwrittenText(localResult.text),
    };
  } catch (error) {
    if (!hasRecipeImportOpenAiOcrFallback()) {
      throw error;
    }

    const fallbackResult = await runOpenAiOcrFallback({
      bytes,
      mimeType: file.type,
    });

    return {
      text: fallbackResult.text,
      provider: "openai",
      filename,
      usedFallback: true,
      lowConfidence: true,
      sparseText: isSparseHandwrittenText(fallbackResult.text),
    };
  }
}

function isSparseHandwrittenText(text: string): boolean {
  const normalized = text.trim();
  if (normalized.length < 24) {
    return true;
  }

  const nonEmptyLines = normalized.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return nonEmptyLines.length < 2;
}

function formatPageList(pageNumbers: number[]): string {
  return pageNumbers.map((pageNumber) => `page ${pageNumber}`).join(", ");
}

function buildReviewHints(pageResults: HandwrittenOcrPageResult[]): string[] {
  const hints = ["Review carefully before continuing. Handwritten recipes can produce ambiguous text."];
  const fallbackPages = pageResults
    .map((pageResult, index) => (pageResult.usedFallback ? index + 1 : null))
    .filter((pageNumber): pageNumber is number => pageNumber !== null);
  const sparsePages = pageResults
    .map((pageResult, index) => (pageResult.sparseText ? index + 1 : null))
    .filter((pageNumber): pageNumber is number => pageNumber !== null);
  const lowConfidencePages = pageResults
    .map((pageResult, index) => (pageResult.lowConfidence && !pageResult.usedFallback ? index + 1 : null))
    .filter((pageNumber): pageNumber is number => pageNumber !== null);

  if (pageResults.length > 1) {
    hints.push("Uploaded pages were merged in the order provided.");
  } else {
    hints.push("Double-check ingredients and steps for OCR mistakes.");
  }

  if (fallbackPages.length > 0) {
    hints.push(`Fallback OCR was needed for ${formatPageList(fallbackPages)}. Compare those pages with the source images.`);
  }

  if (lowConfidencePages.length > 0) {
    hints.push(`Lower-confidence OCR was detected on ${formatPageList(lowConfidencePages)}. Review names, quantities, and steps closely.`);
  }

  if (sparsePages.length > 0) {
    hints.push(`Very little text was detected on ${formatPageList(sparsePages)}. Make sure nothing important was missed.`);
  }

  return hints;
}

export function shouldUseHandwrittenDraftFallback(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("Could not identify ingredients") ||
    message.includes("Could not identify preparation steps") ||
    message.includes("Imported draft is missing required ingredients or steps.")
  );
}

export function buildHandwrittenFallbackDraft(content: string): ImportedRecipeDraft {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^page\s+\d+$/i.test(line));

  const title = lines[0] ?? "Imported handwritten recipe";
  const stepLines = lines.slice(1);
  const stepsMarkdown =
    stepLines.length > 0
      ? stepLines.map((line, index) => `${index + 1}. ${line}`).join("\n")
      : "1. Review the source images and rewrite the preparation steps.";

  return {
    title,
    description: null,
    stepsMarkdown,
    language: inferRecipeLanguageFromText(content),
    ingredients: [],
  };
}

export function appendHandwrittenFallbackHint(
  metadata: HandwrittenImportMetadata | null | undefined,
): HandwrittenImportMetadata | null | undefined {
  if (!metadata) {
    return metadata;
  }

  const hint =
    "OCR could not reliably separate ingredients from preparation. Review the draft and add ingredients manually before continuing.";

  if (metadata.reviewHints.includes(hint)) {
    return metadata;
  }

  return {
    ...metadata,
    reviewHints: [...metadata.reviewHints, hint],
  };
}

export async function parseHandwrittenImportRequest(formData: FormData): Promise<HandwrittenImportParseResult> {
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    throw new Error("Upload one or more handwritten recipe images.");
  }

  const maxImageCount = getRecipeImportHandwrittenMaxImageCount();
  if (files.length > maxImageCount) {
    throw new Error(`Upload up to ${maxImageCount} handwritten images per import.`);
  }

  const pageResults: HandwrittenOcrPageResult[] = [];
  const sourceDocuments: HandwrittenImportSourceDocument[] = [];

  for (const file of files) {
    if (!isSupportedOcrMimeType(file.type)) {
      throw new Error("Unsupported handwritten file type. Use JPG, PNG, WEBP, TIFF, or BMP.");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const pageResult = await runHandwrittenOcrForFile(file, bytes);
    pageResults.push(pageResult);
    sourceDocuments.push({
      bytes,
      sourceType: "image",
      originalFilename: file.name || "handwritten-page",
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    });
  }

  const content = pageResults
    .map((pageResult, index) => `Page ${index + 1}\n${pageResult.text.trim()}`)
    .join("\n\n");

  if (content.trim().length === 0) {
    throw new Error("No readable handwriting was detected in the uploaded images.");
  }

  return {
    content,
    sourceType: "image",
    ocrDriver: pageResults.some((page) => page.provider === "openai") ? "openai" : "local",
    sourceDocuments,
    metadata: {
      imageCount: files.length,
      pageOrder: pageResults.map((page) => page.filename),
      ocrProviderUsed: pageResults.some((page) => page.provider === "openai") ? "openai" : "local",
      ocrFallbackUsed: pageResults.some((page) => page.usedFallback),
      ocrProvidersByImage: pageResults.map((page) => page.provider),
      sourceImageVisibility: "private",
      reviewHints: buildReviewHints(pageResults),
      combinedInUploadOrder: true,
    },
  };
}
