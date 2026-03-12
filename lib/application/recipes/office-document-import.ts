import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function normalizeExtractedText(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}

export function isDocxFile(file: File): boolean {
  return (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  );
}

export function isDocFile(file: File): boolean {
  return file.type === "application/msword" || file.name.toLowerCase().endsWith(".doc");
}

async function extractTextWithTextutil(bytes: Buffer, extension: "docx" | "doc"): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "recetas-office-"));
  const inputPath = join(tempDir, `input.${extension}`);

  try {
    await writeFile(inputPath, bytes);
    const { stdout } = await execFileAsync(
      "textutil",
      ["-convert", "txt", "-stdout", inputPath],
      { timeout: 30000, maxBuffer: 5 * 1024 * 1024 },
    );

    return normalizeExtractedText(stdout);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      throw new Error("Office document extraction is not available on this server.");
    }

    if (error instanceof Error) {
      throw new Error(error.message);
    }

    throw new Error("Office document extraction failed.");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function extractTextFromDocx(bytes: Buffer): Promise<string> {
  const text = await extractTextWithTextutil(bytes, "docx");
  if (!text) {
    throw new Error("DOCX extraction failed.");
  }

  return text;
}

export async function extractTextFromDocBestEffort(bytes: Buffer): Promise<string> {
  try {
    const text = await extractTextWithTextutil(bytes, "doc");
    if (!text) {
      throw new Error("Legacy DOC file did not contain extractable text.");
    }

    return text;
  } catch {
    throw new Error(
      "DOC extraction failed. Re-save the file as DOCX, PDF, or TXT and try again.",
    );
  }
}
