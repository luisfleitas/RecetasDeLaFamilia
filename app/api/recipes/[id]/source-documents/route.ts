import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { listVisibleRecipeSourceDocuments } from "@/lib/application/recipes/visible-source-documents";
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

  const sourceDocuments = await listVisibleRecipeSourceDocuments({
    recipeId,
    viewerUserId: authUser?.userId ?? null,
  });

  return NextResponse.json({
    sourceDocuments,
  });
}
