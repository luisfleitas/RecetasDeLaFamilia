// API handlers for listing and creating recipes.
import { parseCreateRecipeInput } from "@/lib/application/recipes/validation";
import type { UploadedRecipeImage } from "@/lib/application/recipes/use-cases";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { buildRecipeUseCases } from "@/lib/recipes/factory";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const recipeUseCases = buildRecipeUseCases();

function parseBooleanParam(value: string | null): boolean {
  if (!value) {
    return false;
  }

  return value === "true" || value === "1";
}

function parseRecipePayloadFromFormData(formData: FormData) {
  const recipePayload = formData.get("recipe");

  if (typeof recipePayload === "string" && recipePayload.trim().length > 0) {
    return parseCreateRecipeInput(JSON.parse(recipePayload));
  }

  const rawIngredients = formData.get("ingredients");
  let ingredients: unknown = [];
  if (typeof rawIngredients === "string" && rawIngredients.trim().length > 0) {
    ingredients = JSON.parse(rawIngredients);
  }

  return parseCreateRecipeInput({
    title: formData.get("title"),
    description: formData.get("description"),
    stepsMarkdown: formData.get("stepsMarkdown"),
    ingredients,
  });
}

async function parseUploadedImagesFromFormData(formData: FormData, fieldName: string) {
  const files = formData.getAll(fieldName);
  const images: UploadedRecipeImage[] = [];

  for (const file of files) {
    if (!(file instanceof File)) {
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    images.push({
      originalFilename: file.name || "image",
      mimeType: file.type,
      sizeBytes: file.size,
      buffer,
    });
  }

  return images;
}

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error("Expected integer value");
  }

  return parsed;
}

function toErrorStatus(error: unknown): number {
  if (!(error instanceof Error)) {
    return 500;
  }

  const message = error.message;
  const isValidationError =
    message.includes("Unsupported image type") ||
    message.includes("10MB") ||
    message.includes("supports up to 8 images") ||
    message.includes("primaryImageIndex") ||
    message.includes("required") ||
    message.includes("must be");

  return isValidationError ? 400 : 500;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includePrimaryImage = parseBooleanParam(searchParams.get("includePrimaryImage"));
    const includeImages = parseBooleanParam(searchParams.get("includeImages"));
    const recipes = await recipeUseCases.listRecipes({ includePrimaryImage, includeImages });

    return NextResponse.json({ recipes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while listing recipes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let recipeInput;
    let images: UploadedRecipeImage[] = [];
    let primaryImageIndex: number | null = null;
    try {
      const formData = await request.formData();
      recipeInput = parseRecipePayloadFromFormData(formData);
      images = await parseUploadedImagesFromFormData(formData, "images");
      primaryImageIndex = parseOptionalInt(formData.get("primaryImageIndex"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid multipart payload";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    try {
      const recipe = await recipeUseCases.createRecipeWithImages(authUser.userId, {
        recipe: recipeInput,
        images,
        primaryImageIndex,
      });

      return NextResponse.json({ recipe }, { status: 201 });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error while creating recipe";
      return NextResponse.json({ error: message }, { status: toErrorStatus(error) });
    }
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
    const message = error instanceof Error ? error.message : "Invalid ingredients";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const recipe = await recipeUseCases.createRecipe(authUser.userId, input);

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while creating recipe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
