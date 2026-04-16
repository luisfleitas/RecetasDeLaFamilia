import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { parseRecipeSourceDocumentMetadata } from "@/lib/application/recipes/source-documents";
import { getPrisma } from "@/lib/prisma";
import { buildRecipeUseCases } from "@/lib/recipes/factory";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

const recipeUseCases = buildRecipeUseCases();

function parseRecipeId(value: string): number | null {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
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
  const { id } = await params;
  const recipeId = parseRecipeId(id);

  if (!recipeId) {
    return NextResponse.json({ error: "Invalid recipe id" }, { status: 400 });
  }

  const recipe = await recipeUseCases.getRecipeById(recipeId, authUser?.userId ?? null);
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const prisma = await getPrisma();
  const canViewPrivateSources = await canAccessPrivateRecipeSources(recipeId, authUser?.userId ?? null);
  const prismaDb = prisma as unknown as {
    recipeSourceDocument: {
      findMany: (args: {
        where: { recipeId: number };
        orderBy: { createdAt: "asc" };
        select: {
          id: true;
          originalFilename: true;
          mimeType: true;
          sizeBytes: true;
          sourceType: true;
          metadataJson: true;
          createdAt: true;
        };
      }) => Promise<Array<{
        id: number;
        originalFilename: string;
        mimeType: string;
        sizeBytes: number;
        sourceType: string;
        metadataJson: string | null;
        createdAt: Date;
      }>>;
    };
  };

  const sourceDocuments = await prismaDb.recipeSourceDocument.findMany({
    where: { recipeId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      sourceType: true,
      metadataJson: true,
      createdAt: true,
    },
  });

  const visibleSourceDocuments = sourceDocuments.filter((doc) => {
    if (canViewPrivateSources) {
      return true;
    }

    const metadata = parseRecipeSourceDocumentMetadata(doc.metadataJson);
    return metadata?.publiclyVisible === true;
  });

  return NextResponse.json({
    sourceDocuments: visibleSourceDocuments.map((doc: {
      id: number;
      originalFilename: string;
      mimeType: string;
      sizeBytes: number;
      sourceType: string;
      metadataJson: string | null;
      createdAt: Date;
    }) => ({
      id: doc.id,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      sourceType: doc.sourceType,
      createdAt: doc.createdAt,
      fileUrl: `/api/recipes/${recipeId}/source-documents/${doc.id}/file`,
    })),
  });
}
