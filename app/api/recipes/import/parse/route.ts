import { importRecipeFromTextDocument } from "@/lib/application/recipes/text-document-import";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_IMPORT_TEXT_BYTES = 512 * 1024;

function isTxtFile(file: File): boolean {
  if (file.type === "text/plain") {
    return true;
  }

  return file.name.toLowerCase().endsWith(".txt");
}

async function parseContentFromMultipartRequest(request: Request): Promise<string> {
  const formData = await request.formData();
  const file = formData.get("file");
  const pastedText = formData.get("content");

  if (typeof pastedText === "string" && pastedText.trim().length > 0) {
    return pastedText;
  }

  if (!(file instanceof File)) {
    throw new Error("Provide recipe text or a .txt file.");
  }

  if (!isTxtFile(file)) {
    throw new Error("Only .txt files are supported in this phase.");
  }

  if (file.size > MAX_IMPORT_TEXT_BYTES) {
    throw new Error("Text file exceeds 512KB limit.");
  }

  return file.text();
}

async function parseContentFromJsonRequest(request: Request): Promise<string> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new Error("Invalid JSON body.");
  }

  const content = (body as { content?: unknown }).content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("content is required.");
  }

  if (Buffer.byteLength(content, "utf8") > MAX_IMPORT_TEXT_BYTES) {
    throw new Error("Text exceeds 512KB limit.");
  }

  return content;
}

export async function POST(request: Request) {
  const authUser = getAuthUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const content = contentType.includes("multipart/form-data")
      ? await parseContentFromMultipartRequest(request)
      : await parseContentFromJsonRequest(request);

    const draft = importRecipeFromTextDocument(content);
    return NextResponse.json({ draft });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected parse error while importing recipe.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
