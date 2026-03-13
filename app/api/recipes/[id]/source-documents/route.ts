import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
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
          createdAt: true;
        };
      }) => Promise<Array<{
        id: number;
        originalFilename: string;
        mimeType: string;
        sizeBytes: number;
        sourceType: string;
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
      createdAt: true,
    },
  });

  return NextResponse.json({
    sourceDocuments: sourceDocuments.map((doc: {
      id: number;
      originalFilename: string;
      mimeType: string;
      sizeBytes: number;
      sourceType: string;
      createdAt: Date;
    }) => ({
      ...doc,
      fileUrl: `/api/recipes/${recipeId}/source-documents/${doc.id}/file`,
    })),
  });
}
