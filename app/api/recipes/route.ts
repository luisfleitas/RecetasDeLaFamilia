// API handlers for listing and creating recipes.
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type IncomingIngredient = {
  name?: unknown;
  qty?: unknown;
  unit?: unknown;
  notes?: unknown;
  position?: unknown;
};

type IncomingRecipe = {
  title?: unknown;
  description?: unknown;
  stepsMarkdown?: unknown;
  ingredients?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toOptionalString(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error("Expected string");
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toPositiveNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a positive number`);
  }
  return value as number;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
}

function toFraction(value: number) {
  const denominator = 1000;
  const numerator = Math.round(value * denominator);
  const divisor = gcd(numerator, denominator);
  return {
    qtyNum: numerator / divisor,
    qtyDen: denominator / divisor,
  };
}

function toPositivePosition(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value as number;
}

function parseIngredients(input: unknown) {
  if (!Array.isArray(input)) {
    throw new Error("ingredients must be an array");
  }
  if (input.length === 0) {
    throw new Error("ingredients must be a non-empty array");
  }

  return input.map((item, index) => {
    const ingredient = item as IncomingIngredient;

    if (!isNonEmptyString(ingredient.name)) {
      throw new Error(`ingredients[${index}].name is required`);
    }
    if (!isNonEmptyString(ingredient.unit)) {
      throw new Error(`ingredients[${index}].unit is required`);
    }

    if (ingredient.qty == null) {
      throw new Error(`ingredients[${index}].qty is required`);
    }
    if (ingredient.position == null) {
      throw new Error(`ingredients[${index}].position is required`);
    }

    const qty = toPositiveNumber(ingredient.qty, `ingredients[${index}].qty`);
    const { qtyNum, qtyDen } = toFraction(qty);
    const position = toPositivePosition(ingredient.position, `ingredients[${index}].position`);

    return {
      name: ingredient.name.trim(),
      qtyNum,
      qtyDen,
      unit: ingredient.unit.trim(),
      notes: toOptionalString(ingredient.notes),
      position,
    };
  });
}

export async function GET() {
  try {
    const prisma = await getPrisma();
    const recipes = await prisma.recipe.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ recipes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while listing recipes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: IncomingRecipe;

  try {
    body = (await request.json()) as IncomingRecipe;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isNonEmptyString(body.title)) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (!isNonEmptyString(body.stepsMarkdown)) {
    return NextResponse.json({ error: "stepsMarkdown is required" }, { status: 400 });
  }

  let ingredients;
  try {
    ingredients = parseIngredients(body.ingredients);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid ingredients";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let description: string | null;
  try {
    description = toOptionalString(body.description);
  } catch {
    return NextResponse.json({ error: "description must be a string" }, { status: 400 });
  }

  try {
    const prisma = await getPrisma();
    const recipe = await prisma.recipe.create({
      data: {
        title: body.title.trim(),
        description,
        stepsMarkdown: body.stepsMarkdown.trim(),
        ingredients: {
          create: ingredients,
        },
      },
      include: {
        ingredients: {
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while creating recipe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
