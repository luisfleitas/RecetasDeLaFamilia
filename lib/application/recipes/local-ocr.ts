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

export async function extractTextWithLocalOcr(input: OcrInput): Promise<string> {
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
      [imagePath, "stdout", "-l", langs],
      { timeout: normalizedTimeoutMs, maxBuffer: 5 * 1024 * 1024 },
    );

    const text = stdout.trim();
    if (!text) {
      throw new Error("OCR did not detect text.");
    }

    return text;
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
