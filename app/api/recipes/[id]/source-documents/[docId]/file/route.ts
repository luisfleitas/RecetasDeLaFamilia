import { Readable } from "node:stream";
import { parseRecipeSourceDocumentMetadata } from "@/lib/application/recipes/source-documents";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { buildImageStorageProvider } from "@/lib/infrastructure/images/storage-factory";
import { getPrisma } from "@/lib/prisma";
import { buildRecipeUseCases } from "@/lib/recipes/factory";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string; docId: string }>;
};

const recipeUseCases = buildRecipeUseCases();
const storageProvider = buildImageStorageProvider();

function parsePositiveInt(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function toContentDispositionFilename(value: string): string {
  const normalized = value.replace(/[^\x20-\x7E]+/g, "").replace(/["\\]/g, "");
  return normalized.length > 0 ? normalized : "source-document";
}

async function canAccessPrivateRecipeSources(recipeId: number, viewerUserId: number | null) {
  if (!viewerUserId) {
    return false;
  }

  const prisma = await getPrisma();
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: {
      createdByUserId: true,
      visibility: true,
      familyLinks: {
        select: {
          family: {
            select: {
              memberships: {
                where: { userId: viewerUserId },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  if (!recipe) {
    return false;
  }

  if (recipe.createdByUserId === viewerUserId) {
    return true;
  }

  if (recipe.visibility !== "family") {
    return false;
  }

  return recipe.familyLinks.some((link) => link.family.memberships.length > 0);
}

export async function GET(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);
  const { id, docId } = await params;
  const recipeId = parsePositiveInt(id);
  const sourceDocumentId = parsePositiveInt(docId);

  if (!recipeId || !sourceDocumentId) {
    return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
  }

  const recipe = await recipeUseCases.getRecipeById(recipeId, authUser?.userId ?? null);
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const prisma = await getPrisma();
  const canViewPrivateSources = await canAccessPrivateRecipeSources(recipeId, authUser?.userId ?? null);
  const prismaDb = prisma as unknown as {
    recipeSourceDocument: {
      findFirst: (args: {
        where: { id: number; recipeId: number };
        select: {
          id: true;
          originalFilename: true;
          mimeType: true;
          storageKey: true;
          metadataJson: true;
        };
      }) => Promise<{
        id: number;
        originalFilename: string;
        mimeType: string;
        storageKey: string;
        metadataJson: string | null;
      } | null>;
    };
  };
  const sourceDocument = await prismaDb.recipeSourceDocument.findFirst({
    where: {
      id: sourceDocumentId,
      recipeId,
    },
    select: {
      id: true,
      originalFilename: true,
      mimeType: true,
      storageKey: true,
      metadataJson: true,
    },
  });

  if (!sourceDocument) {
    return NextResponse.json({ error: "Source document not found" }, { status: 404 });
  }

  const metadata = parseRecipeSourceDocumentMetadata(sourceDocument.metadataJson);
  if (!canViewPrivateSources && metadata?.publiclyVisible !== true) {
    return NextResponse.json({ error: "Source document not found" }, { status: 404 });
  }

  try {
    const nodeStream = await storageProvider.getObjectStream(sourceDocument.storageKey);
    const stream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
    return new Response(stream, {
      headers: {
        "Content-Type": sourceDocument.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${toContentDispositionFilename(sourceDocument.originalFilename)}"`,
        "Cache-Control": metadata?.publiclyVisible ? "public, max-age=300" : "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Source document file not found" }, { status: 404 });
  }
}
