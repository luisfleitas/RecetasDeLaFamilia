// API handler for fetching a single recipe by id.
import { parseRecipeId } from "@/lib/application/recipes/validation";
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
