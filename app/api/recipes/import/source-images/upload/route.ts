import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  HANDWRITTEN_UPLOAD_ALLOWED_CONTENT_TYPES,
  assertHandwrittenSourceImageUpload,
  sanitizeUploadPathSegment,
} from "@/lib/application/recipes/handwritten-source-staging";
import { getRecipeImportHandwrittenMaxImageBytes } from "@/lib/application/recipes/import-config";
import { createStagedHandwrittenSourceDocument } from "@/lib/application/recipes/source-documents";
import { getCompletedAuthUserFromRequest } from "@/lib/auth/request-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ClientPayload = {
  uploadBatchId: string;
  clientFileId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

function parseClientPayload(value: string | null): ClientPayload {
  if (!value) {
    throw new Error("Upload metadata is required.");
  }

  const parsed = JSON.parse(value) as Partial<ClientPayload>;
  if (
    typeof parsed.uploadBatchId !== "string" ||
    typeof parsed.clientFileId !== "string" ||
    typeof parsed.originalFilename !== "string" ||
    typeof parsed.mimeType !== "string" ||
    typeof parsed.sizeBytes !== "number"
  ) {
    throw new Error("Invalid upload metadata.");
  }

  assertHandwrittenSourceImageUpload({
    mimeType: parsed.mimeType,
    sizeBytes: parsed.sizeBytes,
  });

  return {
    uploadBatchId: parsed.uploadBatchId,
    clientFileId: sanitizeUploadPathSegment(parsed.clientFileId),
    originalFilename: parsed.originalFilename,
    mimeType: parsed.mimeType,
    sizeBytes: parsed.sizeBytes,
  };
}

export async function POST(request: Request) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  try {
    const authResult =
      body.type === "blob.generate-client-token"
        ? await getCompletedAuthUserFromRequest(request)
        : null;
    if (authResult?.status === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (authResult?.status === "profile_incomplete") {
      return authResult.response;
    }
    const authUser = authResult?.authUser ?? null;

    const response = await handleUpload({
      body,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const parsedPayload = parseClientPayload(clientPayload);

        return {
          allowedContentTypes: HANDWRITTEN_UPLOAD_ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: getRecipeImportHandwrittenMaxImageBytes(),
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({
            userId: authUser!.userId,
            ...parsedPayload,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const parsedPayload = parseClientPayload(tokenPayload ?? null);
        const payload = JSON.parse(tokenPayload ?? "{}") as { userId?: unknown };
        if (typeof payload.userId !== "number") {
          throw new Error("Upload owner mismatch.");
        }

        await createStagedHandwrittenSourceDocument({
          userId: payload.userId,
          uploadBatchId: parsedPayload.uploadBatchId,
          clientFileId: parsedPayload.clientFileId,
          originalFilename: parsedPayload.originalFilename,
          mimeType: parsedPayload.mimeType,
          sizeBytes: parsedPayload.sizeBytes,
          storageKey: blob.pathname,
        });
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while preparing upload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
