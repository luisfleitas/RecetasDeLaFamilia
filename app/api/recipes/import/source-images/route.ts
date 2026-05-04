import {
  assertHandwrittenSourceImageBatch,
  assertHandwrittenSourceImageUpload,
  sanitizeUploadPathSegment,
} from "@/lib/application/recipes/handwritten-source-staging";
import { getRecipeImportHandwrittenBlobUploadPathPrefix } from "@/lib/application/recipes/import-config";
import {
  createStagedHandwrittenSourceDocument,
  listStagedHandwrittenSourceDocuments,
} from "@/lib/application/recipes/source-documents";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { buildImageStorageProvider } from "@/lib/infrastructure/images/storage-factory";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const storageProvider = buildImageStorageProvider();

function parseUploadBatchId(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return /^[a-zA-Z0-9._-]{1,96}$/.test(normalized) ? normalized : null;
}

export async function GET(request: Request) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const uploadBatchId = parseUploadBatchId(searchParams.get("uploadBatchId"));
  if (!uploadBatchId) {
    return NextResponse.json({ error: "uploadBatchId is required" }, { status: 400 });
  }

  const sources = await listStagedHandwrittenSourceDocuments({
    userId: authUser.userId,
    uploadBatchId,
  });

  return NextResponse.json({
    sources: sources.map((source) => ({
      id: source.id,
      originalFilename: source.originalFilename,
      mimeType: source.mimeType,
      sizeBytes: source.sizeBytes,
      storageKey: source.storageKey,
      clientFileId: source.clientFileId,
    })),
  });
}

export async function POST(request: Request) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid source-image upload payload" }, { status: 400 });
  }

  const uploadBatchId = parseUploadBatchId(String(formData.get("uploadBatchId") ?? ""));
  const clientFileId = sanitizeUploadPathSegment(String(formData.get("clientFileId") ?? "source"));
  const file = formData.get("image");
  if (!uploadBatchId || !(file instanceof File)) {
    return NextResponse.json({ error: "uploadBatchId and image are required" }, { status: 400 });
  }

  try {
    assertHandwrittenSourceImageUpload({
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    });
    assertHandwrittenSourceImageBatch({
      imageCount: 1,
      totalBytes: file.size,
    });

    const safeName = sanitizeUploadPathSegment(file.name || "handwritten-source");
    const logicalKey = `imports/staging/${uploadBatchId}/${clientFileId}-${safeName}`;
    const storageKey = `${getRecipeImportHandwrittenBlobUploadPathPrefix()}${logicalKey}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    await storageProvider.putObject({
      key: storageKey,
      buffer: bytes,
      contentType: file.type || "application/octet-stream",
    });

    const source = await createStagedHandwrittenSourceDocument({
      userId: authUser.userId,
      uploadBatchId,
      clientFileId,
      originalFilename: file.name || "handwritten-source",
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      storageKey,
    });

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while staging source image";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
