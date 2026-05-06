import { parseRecipeSourceDocumentMetadata } from "@/lib/application/recipes/source-documents";
import { getPrisma } from "@/lib/prisma";

export type VisibleRecipeSourceDocument = {
  id: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sourceType: string;
  createdAt: Date;
  fileUrl: string;
  publiclyVisible: boolean;
  isPrimary: boolean;
};

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

export async function listVisibleRecipeSourceDocuments(input: {
  recipeId: number;
  viewerUserId: number | null;
}): Promise<VisibleRecipeSourceDocument[]> {
  const prisma = await getPrisma();
  const canViewPrivateSources = await canAccessPrivateRecipeSources(input.recipeId, input.viewerUserId);
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
    where: { recipeId: input.recipeId },
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

  return sourceDocuments
    .filter((doc) => {
      if (canViewPrivateSources) {
        return true;
      }

      const metadata = parseRecipeSourceDocumentMetadata(doc.metadataJson);
      return metadata?.publiclyVisible === true;
    })
    .map((doc) => {
      const metadata = parseRecipeSourceDocumentMetadata(doc.metadataJson);

      return {
        id: doc.id,
        originalFilename: doc.originalFilename,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        sourceType: doc.sourceType,
        createdAt: doc.createdAt,
        fileUrl: `/api/recipes/${input.recipeId}/source-documents/${doc.id}/file`,
        publiclyVisible: metadata?.publiclyVisible === true,
        isPrimary: metadata?.isPrimary === true,
      };
    });
}
