import { isRecipeImportEnabled } from "@/lib/application/recipes/import-config";
import { getImportWarningsForDraft } from "@/lib/application/recipes/import-warnings";
import { importRecipeFromTextDocument } from "@/lib/application/recipes/text-document-import";
import { extractTextWithLocalOcr, isSupportedOcrMimeType } from "@/lib/application/recipes/local-ocr";
import { extractTextFromPdfWithLocalOcr, isPdfFile } from "@/lib/application/recipes/pdf-import";
import { stageImportSourceDocument, type ImportSourceType } from "@/lib/application/recipes/source-documents";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_IMPORT_TEXT_BYTES = 512 * 1024;
const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
const DEFAULT_SESSION_TTL_HOURS = 24;

function isTxtFile(file: File): boolean {
  if (file.type === "text/plain") {
    return true;
  }

  return file.name.toLowerCase().endsWith(".txt");
}

type ParsedImportRequest = {
  content: string;
  sourceDocument:
    | {
        bytes: Buffer;
        sourceType: ImportSourceType;
        originalFilename: string;
        mimeType: string;
        sizeBytes: number;
      }
    | null;
};

async function parseContentFromMultipartRequest(request: Request): Promise<ParsedImportRequest> {
  const formData = await request.formData();
  const file = formData.get("file");
  const pastedText = formData.get("content");

  if (typeof pastedText === "string" && pastedText.trim().length > 0) {
    return { content: pastedText, sourceDocument: null };
  }

  if (!(file instanceof File)) {
    throw new Error("Provide recipe text, a TXT/PDF file, or a supported image file.");
  }

  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error("File exceeds 10MB limit.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  const originalFilename = file.name || "source-document";

  if (!isTxtFile(file)) {
    if (isPdfFile(file)) {
      return {
        content: await extractTextFromPdfWithLocalOcr(bytes),
        sourceDocument: {
          bytes,
          sourceType: "pdf",
          originalFilename,
          mimeType,
          sizeBytes: file.size,
        },
      };
    }

    if (!isSupportedOcrMimeType(file.type)) {
      throw new Error(
        "Unsupported file type. Use TXT, PDF, or an image file (JPG, PNG, WEBP, TIFF, BMP).",
      );
    }

    return {
      content: await extractTextWithLocalOcr({
        bytes,
        mimeType: file.type,
      }),
      sourceDocument: {
        bytes,
        sourceType: "image",
        originalFilename,
        mimeType,
        sizeBytes: file.size,
      },
    };
  }

  if (file.size > MAX_IMPORT_TEXT_BYTES) {
    throw new Error("Text file exceeds 512KB limit.");
  }

  return {
    content: bytes.toString("utf8"),
    sourceDocument: {
      bytes,
      sourceType: "txt",
      originalFilename,
      mimeType,
      sizeBytes: file.size,
    },
  };
}

async function parseContentFromJsonRequest(request: Request): Promise<ParsedImportRequest> {
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

  return {
    content,
    sourceDocument: null,
  };
}

export async function POST(request: Request) {
  if (!isRecipeImportEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const authUser = getAuthUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let draft;
  let parsedRequest: ParsedImportRequest;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    parsedRequest = contentType.includes("multipart/form-data")
      ? await parseContentFromMultipartRequest(request)
      : await parseContentFromJsonRequest(request);

    draft = importRecipeFromTextDocument(parsedRequest.content);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected parse error while importing recipe.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let createdSessionId: string | null = null;
  try {
    const ttlHours = Number(process.env.RECIPE_IMPORT_SESSION_TTL_HOURS ?? DEFAULT_SESSION_TTL_HOURS);
    const expiresAt = new Date(
      Date.now() + (Number.isFinite(ttlHours) ? ttlHours : DEFAULT_SESSION_TTL_HOURS) * 60 * 60 * 1000,
    );
    const prisma = await getPrisma();
    const session = await prisma.importSession.create({
      data: {
        userId: authUser.userId,
        status: "PARSED",
        draftJson: JSON.stringify(draft),
        expiresAt,
      },
      select: {
        id: true,
      },
    });
    createdSessionId = session.id;

    if (parsedRequest.sourceDocument) {
      await stageImportSourceDocument({
        userId: authUser.userId,
        importSessionId: session.id,
        originalFilename: parsedRequest.sourceDocument.originalFilename,
        mimeType: parsedRequest.sourceDocument.mimeType,
        sizeBytes: parsedRequest.sourceDocument.sizeBytes,
        sourceType: parsedRequest.sourceDocument.sourceType,
        bytes: parsedRequest.sourceDocument.bytes,
      });
    }

    return NextResponse.json({
      importSessionId: session.id,
      draft,
      warnings: getImportWarningsForDraft(draft),
    });
  } catch (error) {
    if (createdSessionId) {
      try {
        const prisma = await getPrisma();
        await prisma.importSession.delete({ where: { id: createdSessionId } });
      } catch {
        // Preserve the original persistence error; cleanup is best effort.
      }
    }

    const message =
      error instanceof Error ? error.message : "Unexpected persistence error while saving import session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
