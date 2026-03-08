import { isRecipeImportEnabled } from "@/lib/application/recipes/import-config";
import { checkRecipeImportParseRateLimit } from "@/lib/application/recipes/import-rate-limit";
import { recordRecipeImportTelemetry } from "@/lib/application/recipes/import-telemetry";
import {
  RecipeImportParseTimeoutError,
  withRecipeImportParseTimeout,
} from "@/lib/application/recipes/import-timeout";
import { getImportWarningsForDraft } from "@/lib/application/recipes/import-warnings";
import { importRecipeFromTextDocument } from "@/lib/application/recipes/text-document-import";
import { extractTextWithLocalOcr, isSupportedOcrMimeType } from "@/lib/application/recipes/local-ocr";
import { extractTextFromPdfWithLocalOcr, isPdfFile } from "@/lib/application/recipes/pdf-import";
import { stageImportSourceDocument, type ImportSourceType } from "@/lib/application/recipes/source-documents";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { getRequestId, withRequestId } from "@/lib/phase3/observability";
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
  sourceType: "paste" | ImportSourceType;
  pdfExtractionMethod?: "text-layer" | "ocr-preview" | null;
  ocrDriver?: "local" | null;
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
    return {
      content: pastedText,
      sourceType: "paste",
      pdfExtractionMethod: null,
      ocrDriver: null,
      sourceDocument: null,
    };
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
      const pdfResult = await extractTextFromPdfWithLocalOcr(bytes);
      return {
        content: pdfResult.text,
        sourceType: "pdf",
        pdfExtractionMethod: pdfResult.extractionMethod,
        ocrDriver: pdfResult.extractionMethod === "ocr-preview" ? "local" : null,
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
      sourceType: "image",
      pdfExtractionMethod: null,
      ocrDriver: "local",
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
    sourceType: "txt",
    pdfExtractionMethod: null,
    ocrDriver: null,
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
    sourceType: "paste",
    pdfExtractionMethod: null,
    ocrDriver: null,
    sourceDocument: null,
  };
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  if (!isRecipeImportEnabled()) {
    return withRequestId(NextResponse.json({ error: "Not found" }, { status: 404 }), requestId);
  }

  const authUser = getAuthUserFromRequest(request);
  if (!authUser) {
    return withRequestId(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), requestId);
  }

  const startedAt = Date.now();
  const prisma = await getPrisma();

  const rate = checkRecipeImportParseRateLimit(authUser.userId);
  if (!rate.allowed) {
    const limitedResponse = NextResponse.json(
      { error: "Too many recipe import attempts. Please retry later.", code: "RATE_LIMITED" },
      { status: 429 },
    );
    limitedResponse.headers.set("retry-after", String(rate.retryAfterSeconds));
    try {
      await recordRecipeImportTelemetry({
        prisma,
        requestId,
        userId: authUser.userId,
        statusCode: 429,
        sourceType: "unknown",
        outcome: "rate_limited",
        errorCode: "RATE_LIMITED",
        latencyMs: Date.now() - startedAt,
      });
    } catch {
      // Metrics are best effort and must not block the request.
    }
    return withRequestId(limitedResponse, requestId);
  }

  try {
    return await withRecipeImportParseTimeout(async () => {
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
        const errorResponse = NextResponse.json({ error: message }, { status: 400 });
        try {
          await recordRecipeImportTelemetry({
            prisma,
            requestId,
            userId: authUser.userId,
            statusCode: 400,
            sourceType: "unknown",
            outcome: "error",
            errorCode: "PARSE_ERROR",
            latencyMs: Date.now() - startedAt,
          });
        } catch {
          // Metrics are best effort and must not block the request.
        }
        return withRequestId(errorResponse, requestId);
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

        const warnings = getImportWarningsForDraft(draft);
        const response = NextResponse.json({
          importSessionId: session.id,
          draft,
          warnings,
        });
        try {
          await recordRecipeImportTelemetry({
            prisma,
            requestId,
            userId: authUser.userId,
            statusCode: 200,
            sourceType: parsedRequest.sourceType,
            outcome: "success",
            latencyMs: Date.now() - startedAt,
            warningCount: warnings.length,
            pdfExtractionMethod: parsedRequest.pdfExtractionMethod ?? null,
            ocrDriver: parsedRequest.ocrDriver ?? null,
          });
        } catch {
          // Metrics are best effort and must not block the request.
        }
        return withRequestId(response, requestId);
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
        const errorResponse = NextResponse.json({ error: message }, { status: 500 });
        try {
          await recordRecipeImportTelemetry({
            prisma,
            requestId,
            userId: authUser.userId,
            statusCode: 500,
            sourceType: parsedRequest.sourceType,
            outcome: "error",
            errorCode: "PERSISTENCE_ERROR",
            latencyMs: Date.now() - startedAt,
            pdfExtractionMethod: parsedRequest.pdfExtractionMethod ?? null,
            ocrDriver: parsedRequest.ocrDriver ?? null,
          });
        } catch {
          // Metrics are best effort and must not block the request.
        }
        return withRequestId(errorResponse, requestId);
      }
    });
  } catch (error) {
    if (error instanceof RecipeImportParseTimeoutError) {
      const timeoutResponse = NextResponse.json(
        { error: error.message, code: "EXTRACTION_TIMEOUT" },
        { status: 504 },
      );
      try {
        await recordRecipeImportTelemetry({
          prisma,
          requestId,
          userId: authUser.userId,
          statusCode: 504,
          sourceType: "unknown",
          outcome: "error",
          errorCode: "EXTRACTION_TIMEOUT",
          latencyMs: Date.now() - startedAt,
        });
      } catch {
        // Metrics are best effort and must not block the request.
      }
      return withRequestId(timeoutResponse, requestId);
    }

    const message =
      error instanceof Error ? error.message : "Unexpected parse error while importing recipe.";
    const errorResponse = NextResponse.json({ error: message }, { status: 500 });
    try {
      await recordRecipeImportTelemetry({
        prisma,
        requestId,
        userId: authUser.userId,
        statusCode: 500,
        sourceType: "unknown",
        outcome: "error",
        errorCode: "UNEXPECTED_ERROR",
        latencyMs: Date.now() - startedAt,
      });
    } catch {
      // Metrics are best effort and must not block the request.
    }
    return withRequestId(errorResponse, requestId);
  }
}
