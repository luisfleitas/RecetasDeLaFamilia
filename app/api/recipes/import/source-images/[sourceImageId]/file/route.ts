import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { buildImageStorageProvider } from "@/lib/infrastructure/images/storage-factory";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ sourceImageId: string }>;
};

const storageProvider = buildImageStorageProvider();

function parsePositiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toContentDispositionFilename(filename: string) {
  return filename.replace(/["\\\r\n]/g, "_");
}

export async function GET(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sourceImageId } = await params;
  const parsedSourceImageId = parsePositiveInt(sourceImageId);
  if (!parsedSourceImageId) {
    return NextResponse.json({ error: "Invalid source image id" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const prismaDb = prisma as unknown as {
    recipeSourceDocument: {
      findFirst: (args: {
        where: {
          id: number;
          uploadedByUserId: number;
          recipeId: null;
          sourceType: "image";
        };
        select: {
          originalFilename: true;
          mimeType: true;
          storageKey: true;
        };
      }) => Promise<{
        originalFilename: string;
        mimeType: string;
        storageKey: string;
      } | null>;
    };
  };

  const sourceDocument = await prismaDb.recipeSourceDocument.findFirst({
    where: {
      id: parsedSourceImageId,
      uploadedByUserId: authUser.userId,
      recipeId: null,
      sourceType: "image",
    },
    select: {
      originalFilename: true,
      mimeType: true,
      storageKey: true,
    },
  });

  if (!sourceDocument) {
    return NextResponse.json({ error: "Source image not found" }, { status: 404 });
  }

  const nodeStream = await storageProvider.getObjectStream(sourceDocument.storageKey);
  return new Response(nodeStream as unknown as ReadableStream, {
    headers: {
      "Content-Type": sourceDocument.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${toContentDispositionFilename(sourceDocument.originalFilename)}"`,
    },
  });
}
