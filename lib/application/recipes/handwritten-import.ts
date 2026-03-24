import {
  getRecipeImportHandwrittenMaxImageCount,
  getRecipeImportHandwrittenPrimaryOcrProvider,
  hasRecipeImportOpenAiOcrFallback,
} from "@/lib/application/recipes/import-config";
import { extractTextWithLocalOcrResult, isSupportedOcrMimeType } from "@/lib/application/recipes/local-ocr";
import { runOpenAiOcrFallback } from "@/lib/application/recipes/openai-ocr";
import type { HandwrittenImportMetadata } from "@/lib/application/recipes/import-session-metadata";
import type { ImportSourceType } from "@/lib/application/recipes/source-documents";

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
};

async function runHandwrittenOcrForFile(file: File, bytes: Buffer): Promise<HandwrittenOcrPageResult> {
  const preferredProvider = getRecipeImportHandwrittenPrimaryOcrProvider();

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
      filename: file.name || "handwritten-page",
    };
  }

  const localResult = await extractTextWithLocalOcrResult({
    bytes,
    mimeType: file.type,
  });

  if ("ocrDriver" in localResult) {
    return {
      text: localResult.text,
      provider: "openai",
      filename: file.name || "handwritten-page",
    };
  }

  return {
    text: localResult.text,
    provider: "local",
    filename: file.name || "handwritten-page",
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
      ocrProvidersByImage: pageResults.map((page) => page.provider),
      sourceImageVisibility: "private",
      reviewHints: [
        "Review carefully before continuing. Handwritten recipes can produce ambiguous text.",
        files.length > 1 ? "Uploaded pages were merged in the order provided." : "Double-check ingredients and steps for OCR mistakes.",
      ],
      combinedInUploadOrder: true,
    },
  };
}
