// API handler for fetching a single recipe by id.
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

function parseId(id: string): number | null {
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const recipeId = parseId(id);

  if (!recipeId) {
    return NextResponse.json({ error: "Invalid recipe id" }, { status: 400 });
  }

  try {
    const prisma = await getPrisma();
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const recipeWithDecimalQty = {
      ...recipe,
      ingredients: recipe.ingredients.map((ingredient) => ({
        ...ingredient,
        qty: Number((ingredient.qtyNum / ingredient.qtyDen).toFixed(3)),
      })),
    };

    return NextResponse.json({ recipe: recipeWithDecimalQty });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while fetching recipe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
