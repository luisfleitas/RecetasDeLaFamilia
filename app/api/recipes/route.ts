// API handlers for listing and creating recipes.
import { parseCreateRecipeInput } from "@/lib/application/recipes/validation";
import { buildRecipeUseCases } from "@/lib/recipes/factory";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const recipeUseCases = buildRecipeUseCases();

export async function GET() {
  try {
    const recipes = await recipeUseCases.listRecipes();

    return NextResponse.json({ recipes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while listing recipes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const message = error instanceof Error ? error.message : "Invalid ingredients";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const recipe = await recipeUseCases.createRecipe(input);

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while creating recipe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
