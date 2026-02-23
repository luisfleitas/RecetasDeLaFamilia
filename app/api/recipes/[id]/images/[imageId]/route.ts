import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { buildRecipeUseCases } from "@/lib/recipes/factory";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string; imageId: string }>;
};

const recipeUseCases = buildRecipeUseCases();

function parsePositiveInt(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function DELETE(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawRecipeId, imageId: rawImageId } = await params;
  const recipeId = parsePositiveInt(rawRecipeId);
  const imageId = parsePositiveInt(rawImageId);

  if (!recipeId || !imageId) {
    return NextResponse.json({ error: "Invalid recipe or image id" }, { status: 400 });
  }

  try {
    const result = await recipeUseCases.deleteRecipeImage(authUser.userId, recipeId, imageId);

    if (result.forbidden) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (result.notFound) {
      return NextResponse.json({ error: "Recipe or image not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      promotedPrimaryImageId: result.promotedPrimaryImageId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while deleting image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
