// API handler for fetching and updating a single recipe by id.
import { listVisibleRecipeSourceImages } from "@/lib/application/recipes/display-source-images";
import { parseCreateRecipeInput, parseRecipeId } from "@/lib/application/recipes/validation";
import { sanitizeRecipeFamilyLinksForUpdate } from "@/lib/application/recipes/family-link-sanitization";
import type { UploadedRecipeImage } from "@/lib/application/recipes/use-cases";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { getPrisma } from "@/lib/prisma";
import { buildRecipeUseCases } from "@/lib/recipes/factory";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

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
    visibility: formData.get("visibility"),
    familyIds: formData.getAll("familyIds").map((value) => Number(value)),
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
    message.includes("primaryImage") ||
    message.includes("visibility") ||
    message.includes("familyIds") ||
    message.includes("required") ||
    message.includes("must be");

  return isValidationError ? 400 : 500;
}

async function sanitizeUpdateInputFamilyLinksForUser(userId: number, input: ReturnType<typeof parseCreateRecipeInput>) {
  const uniqueRequestedFamilyIds = [...new Set(input.familyIds)];

  if (uniqueRequestedFamilyIds.length === 0) {
    return sanitizeRecipeFamilyLinksForUpdate(input, []);
  }

  const prisma = await getPrisma();
  const memberships = await prisma.familyMembership.findMany({
    where: {
      userId,
      familyId: {
        in: uniqueRequestedFamilyIds,
      },
    },
    select: {
      familyId: true,
    },
  });

  return sanitizeRecipeFamilyLinksForUpdate(
    input,
    memberships.map((membership) => membership.familyId),
  );
}

export async function GET(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);
  const { id } = await params;
  const recipeId = parseRecipeId(id);

  if (!recipeId) {
    return NextResponse.json({ error: "Invalid recipe id" }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const includePrimaryImage = parseBooleanParam(searchParams.get("includePrimaryImage"));
    const includeImages = parseBooleanParam(searchParams.get("includeImages"));
    const recipe = await recipeUseCases.getRecipeById(recipeId, authUser?.userId ?? null, {
      includePrimaryImage,
      includeImages,
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    if (!includeImages) {
      return NextResponse.json({ recipe });
    }

    const visibleSourceImagesByRecipeId = await listVisibleRecipeSourceImages(
      [recipe],
      authUser?.userId ?? null,
    );
    const visibleSourceImages = visibleSourceImagesByRecipeId.get(recipe.id) ?? [];

    return NextResponse.json({
      recipe: {
        ...recipe,
        images: [...(recipe.images ?? []), ...visibleSourceImages],
      },
    });
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

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    let recipeInput;
    let newImages: UploadedRecipeImage[] = [];
    let primaryImageId: number | null = null;
    let primaryImageIndex: number | null = null;

    try {
      const formData = await request.formData();
      const parsedInput = parseRecipePayloadFromFormData(formData);
      recipeInput = await sanitizeUpdateInputFamilyLinksForUser(authUser.userId, parsedInput);
      newImages = await parseUploadedImagesFromFormData(formData, "newImages");
      primaryImageId = parseOptionalInt(formData.get("primaryImageId"));
      primaryImageIndex = parseOptionalInt(formData.get("primaryImageIndex"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid multipart payload";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    try {
      const result = await recipeUseCases.updateRecipeWithImages(authUser.userId, recipeId, {
        recipe: recipeInput,
        newImages,
        primaryImageId,
        primaryImageIndex,
      });

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
      if (message === "FORBIDDEN_FAMILY_LINK") {
        return NextResponse.json({ error: "Forbidden family link", code: "FORBIDDEN" }, { status: 403 });
      }
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
    const parsedInput = parseCreateRecipeInput(body);
    input = await sanitizeUpdateInputFamilyLinksForUser(authUser.userId, parsedInput);
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
    if (message === "FORBIDDEN_FAMILY_LINK") {
      return NextResponse.json({ error: "Forbidden family link", code: "FORBIDDEN" }, { status: 403 });
    }
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
