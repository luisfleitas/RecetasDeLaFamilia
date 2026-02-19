// API handler for fetching and updating a single recipe by id.
import { parseCreateRecipeInput, parseRecipeId } from "@/lib/application/recipes/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { buildRecipeUseCases } from "@/lib/recipes/factory";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

const recipeUseCases = buildRecipeUseCases();

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const recipeId = parseRecipeId(id);

  if (!recipeId) {
    return NextResponse.json({ error: "Invalid recipe id" }, { status: 400 });
  }

  try {
    const recipe = await recipeUseCases.getRecipeById(recipeId);

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json({ recipe });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while fetching recipe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const recipeId = parseRecipeId(id);

  if (!recipeId) {
    return NextResponse.json({ error: "Invalid recipe id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let input;
  try {
    input = parseCreateRecipeInput(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid recipe payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const result = await recipeUseCases.updateRecipe(authUser.userId, recipeId, input);

    if (result.forbidden) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!result.recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json({ recipe: result.recipe });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while updating recipe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const recipeId = parseRecipeId(id);

  if (!recipeId) {
    return NextResponse.json({ error: "Invalid recipe id" }, { status: 400 });
  }

  try {
    const result = await recipeUseCases.deleteRecipe(authUser.userId, recipeId);

    if (result.forbidden) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!result.deleted) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while deleting recipe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
