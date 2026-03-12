import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { isOpenAiOcrFallbackConfigured, runOpenAiOcrFallback, shouldUseOpenAiOcrFallback } from "@/lib/application/recipes/openai-ocr";
import { shouldForceRecipeImportOpenAiOcr } from "@/lib/application/recipes/import-config";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { extractTextWithLocalOcrResult } from "@/lib/application/recipes/local-ocr";

const execFileAsync = promisify(execFile);

function normalizeExtractedText(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export type PdfImportResult = {
  text: string;
  extractionMethod: "text-layer" | "ocr-preview";
  ocrDriver: "local" | "openai" | null;
  localConfidence: number | null;
};

async function extractTextLayerFromPdf(pdfPath: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      "textutil",
      ["-convert", "txt", "-stdout", pdfPath],
      { timeout: 30000, maxBuffer: 5 * 1024 * 1024 },
    );
    return normalizeExtractedText(stdout);
  } catch {
    return "";
  }
}

async function renderPdfPreviewImage(pdfPath: string, outputDir: string): Promise<Buffer> {
  const previewSize = Number(process.env.RECIPE_IMPORT_PDF_OCR_THUMBNAIL_SIZE ?? "3000");
  const normalizedPreviewSize =
    Number.isFinite(previewSize) && previewSize > 0 ? Math.floor(previewSize) : 3000;

  await execFileAsync(
    "qlmanage",
    ["-t", "-s", String(normalizedPreviewSize), "-o", outputDir, pdfPath],
    { timeout: 30000, maxBuffer: 5 * 1024 * 1024 },
  );

  const canonicalPreviewPath = join(outputDir, `${basename(pdfPath)}.png`);
  try {
    return await readFile(canonicalPreviewPath);
  } catch {
    const candidates = (await readdir(outputDir)).filter((name) => name.toLowerCase().endsWith(".png"));
    if (candidates.length === 0) {
      throw new Error("Could not render PDF preview for OCR.");
    }

    return readFile(join(outputDir, candidates[0] ?? ""));
  }
}

export async function extractTextFromPdfWithLocalOcr(pdfBytes: Buffer): Promise<PdfImportResult> {
  const minTextLayerChars = Number(process.env.RECIPE_IMPORT_PDF_TEXT_LAYER_MIN_CHARS ?? "80");
  const normalizedMinTextLayerChars =
    Number.isFinite(minTextLayerChars) && minTextLayerChars >= 0 ? minTextLayerChars : 80;
  const forceOpenAiOcr = shouldForceRecipeImportOpenAiOcr();

  const tempDir = await mkdtemp(join(tmpdir(), "recetas-pdf-"));
  const pdfPath = join(tempDir, "input.pdf");
  const previewDir = join(tempDir, "preview");

  try {
    await writeFile(pdfPath, pdfBytes);

    const textLayer = await extractTextLayerFromPdf(pdfPath);
    if (!forceOpenAiOcr && textLayer.length >= normalizedMinTextLayerChars) {
      return {
        text: textLayer,
        extractionMethod: "text-layer",
        ocrDriver: null,
        localConfidence: null,
      };
    }

    await mkdir(previewDir);
    const previewBytes = await renderPdfPreviewImage(pdfPath, previewDir);

    if (forceOpenAiOcr) {
      if (!isOpenAiOcrFallbackConfigured()) {
        throw new Error("OpenAI OCR fallback is not configured.");
      }

      const fallbackResult = await runOpenAiOcrFallback({
        bytes: previewBytes,
        mimeType: "image/png",
      });
      return {
        text: fallbackResult.text.trim(),
        extractionMethod: "ocr-preview",
        ocrDriver: "openai",
        localConfidence: null,
      };
    }

    try {
      const localOcrResult = await extractTextWithLocalOcrResult({
        bytes: previewBytes,
        mimeType: "image/png",
      });
      if (
        localOcrResult.text.trim().length > 0 &&
        (!shouldUseOpenAiOcrFallback(localOcrResult.confidence) || !isOpenAiOcrFallbackConfigured())
      ) {
        return {
          text: localOcrResult.text.trim(),
          extractionMethod: "ocr-preview",
          ocrDriver: "local",
          localConfidence: localOcrResult.confidence,
        };
      }

      if (isOpenAiOcrFallbackConfigured()) {
        const fallbackResult = await runOpenAiOcrFallback({
          bytes: previewBytes,
          mimeType: "image/png",
        });
        return {
          text: fallbackResult.text.trim(),
          extractionMethod: "ocr-preview",
          ocrDriver: "openai",
          localConfidence: localOcrResult.confidence,
        };
      }
    } catch (error) {
      if (isOpenAiOcrFallbackConfigured()) {
        const fallbackResult = await runOpenAiOcrFallback({
          bytes: previewBytes,
          mimeType: "image/png",
        });
        return {
          text: fallbackResult.text.trim(),
          extractionMethod: "ocr-preview",
          ocrDriver: "openai",
          localConfidence: null,
        };
      }

      if (error instanceof Error) {
        throw error;
      }
    }

    if (textLayer.length > 0) {
      return {
        text: textLayer,
        extractionMethod: "text-layer",
        ocrDriver: null,
        localConfidence: null,
      };
    }

    throw new Error("PDF does not contain extractable text.");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Local OCR engine is not available")) {
        throw error;
      }

      if (error.message.includes("PDF does not contain extractable text")) {
        throw error;
      }

      throw new Error(`PDF extraction failed: ${error.message}`);
    }

    throw new Error("PDF extraction failed.");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
