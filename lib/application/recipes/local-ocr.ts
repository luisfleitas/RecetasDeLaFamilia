import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const OCR_SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/bmp",
]);

type OcrInput = {
  bytes: Buffer;
  mimeType: string;
};

export type LocalOcrResult = {
  text: string;
  confidence: number;
};

function extensionFromMimeType(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/tiff":
      return "tiff";
    case "image/bmp":
      return "bmp";
    default:
      return "img";
  }
}

export function isSupportedOcrMimeType(mimeType: string): boolean {
  return OCR_SUPPORTED_MIME_TYPES.has(mimeType.toLowerCase());
}

function parseTesseractTsv(stdout: string): LocalOcrResult {
  const lines = stdout.replace(/\r\n?/g, "\n").split("\n").filter((line) => line.length > 0);
  if (lines.length <= 1) {
    throw new Error("OCR did not detect text.");
  }

  const header = lines[0]?.split("\t") ?? [];
  const textIndex = header.indexOf("text");
  const confIndex = header.indexOf("conf");
  const pageIndex = header.indexOf("page_num");
  const blockIndex = header.indexOf("block_num");
  const parIndex = header.indexOf("par_num");
  const lineIndex = header.indexOf("line_num");

  const assembledLines: string[] = [];
  const confidences: number[] = [];
  let activeLineKey: string | null = null;
  let activeWords: string[] = [];

  for (const rawLine of lines.slice(1)) {
    const columns = rawLine.split("\t");
    const text = textIndex >= 0 ? (columns[textIndex] ?? "").trim() : "";
    const conf = confIndex >= 0 ? Number(columns[confIndex]) : Number.NaN;
    const lineKey = [pageIndex, blockIndex, parIndex, lineIndex]
      .map((index) => (index >= 0 ? columns[index] ?? "" : ""))
      .join(":");

    if (activeLineKey !== null && lineKey !== activeLineKey && activeWords.length > 0) {
      assembledLines.push(activeWords.join(" "));
      activeWords = [];
    }

    activeLineKey = lineKey;

    if (text.length > 0) {
      activeWords.push(text);
      if (Number.isFinite(conf) && conf >= 0) {
        confidences.push(conf);
      }
    }
  }

  if (activeWords.length > 0) {
    assembledLines.push(activeWords.join(" "));
  }

  const normalizedText = assembledLines.join("\n").trim();
  if (!normalizedText) {
    throw new Error("OCR did not detect text.");
  }

  const averageConfidence =
    confidences.length > 0 ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length / 100 : 0;

  return {
    text: normalizedText,
    confidence: Math.max(0, Math.min(1, averageConfidence)),
  };
}

export async function extractTextWithLocalOcrResult(input: OcrInput): Promise<LocalOcrResult> {
  if (!isSupportedOcrMimeType(input.mimeType)) {
    throw new Error("Unsupported OCR file type.");
  }

  const langs = (process.env.RECIPE_IMPORT_OCR_LANGS ?? "eng+spa").trim() || "eng+spa";
  const timeoutMs = Number(process.env.RECIPE_IMPORT_OCR_TIMEOUT_MS ?? "30000");
  const normalizedTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30000;

  const tempDir = await mkdtemp(join(tmpdir(), "recetas-ocr-"));
  const imagePath = join(tempDir, `input.${extensionFromMimeType(input.mimeType)}`);

  try {
    await writeFile(imagePath, input.bytes);
    const { stdout } = await execFileAsync(
      "tesseract",
      [imagePath, "stdout", "-l", langs, "tsv"],
      { timeout: normalizedTimeoutMs, maxBuffer: 5 * 1024 * 1024 },
    );
    return parseTesseractTsv(stdout);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      throw new Error("Local OCR engine is not available on this server.");
    }

    if (
      error &&
      typeof error === "object" &&
      "killed" in error &&
      (error as { killed?: boolean }).killed
    ) {
      throw new Error("OCR timed out while reading the image.");
    }

    if (error instanceof Error) {
      throw new Error(`OCR failed: ${error.message}`);
    }

    throw new Error("OCR failed.");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function extractTextWithLocalOcr(input: OcrInput): Promise<string> {
  const result = await extractTextWithLocalOcrResult(input);
  return result.text;
}
