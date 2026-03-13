// API handlers for listing and creating recipes.
import { parseCreateRecipeInput } from "@/lib/application/recipes/validation";
import type { UploadedRecipeImage } from "@/lib/application/recipes/use-cases";
import { promoteImportSessionSourceDocuments } from "@/lib/application/recipes/source-documents";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { buildImageStorageProvider } from "@/lib/infrastructure/images/storage-factory";
import { getPrisma } from "@/lib/prisma";
import { buildRecipeUseCases } from "@/lib/recipes/factory";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const recipeUseCases = buildRecipeUseCases();
const storageProvider = buildImageStorageProvider();

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

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

async function validateImportSessionForCreate(userId: number, importSessionId: string | null) {
  if (!importSessionId) {
    return;
  }

  const prisma = await getPrisma();
  const session = await prisma.importSession.findUnique({
    where: { id: importSessionId },
    select: {
      id: true,
      userId: true,
      status: true,
      expiresAt: true,
    },
  });

  if (!session || session.userId !== userId) {
    throw new Error("Import session not found.");
  }

  if (session.expiresAt.getTime() < Date.now() || session.status === "EXPIRED") {
    if (session.status !== "EXPIRED") {
      await prisma.importSession.update({
        where: { id: session.id },
        data: { status: "EXPIRED" },
      });
    }

    throw new Error("Import session expired.");
  }

  if (session.status !== "PARSED") {
    throw new Error("Import session is not available for recipe creation.");
  }
}

async function markImportSessionConfirmed(userId: number, importSessionId: string | null) {
  if (!importSessionId) {
    return;
  }

  const prisma = await getPrisma();
  await prisma.importSession.updateMany({
    where: {
      id: importSessionId,
      userId,
      status: "PARSED",
    },
    data: {
      status: "CONFIRMED",
    },
  });
}

async function rollbackCreatedRecipe(recipeId: number) {
  const prisma = await getPrisma();
  const [recipeImages, sourceDocuments] = await Promise.all([
    prisma.recipeImage.findMany({
      where: { recipeId },
      select: {
        storageKey: true,
        thumbnailKey: true,
      },
    }),
    (prisma as unknown as {
      recipeSourceDocument: {
        findMany: (args: {
          where: { recipeId: number };
          select: { storageKey: true };
        }) => Promise<Array<{ storageKey: string }>>;
      };
    }).recipeSourceDocument.findMany({
      where: { recipeId },
      select: { storageKey: true },
    }),
  ]);

  await prisma.recipe.deleteMany({
    where: { id: recipeId },
  });

  const storageKeys = new Set<string>();
  for (const image of recipeImages) {
    storageKeys.add(image.storageKey);
    storageKeys.add(image.thumbnailKey);
  }
  for (const doc of sourceDocuments) {
    storageKeys.add(doc.storageKey);
  }

  const deleteResults = await Promise.allSettled(
    [...storageKeys].map((key) => storageProvider.deleteObject(key)),
  );
  const failedDeletes = deleteResults.filter((result) => result.status === "rejected").length;

  if (failedDeletes > 0) {
    console.error("[recipes.create] rollback left orphaned storage objects", {
      recipeId,
      failedDeletes,
      totalKeys: storageKeys.size,
    });
  }
}

function toErrorStatus(error: unknown): number {
  if (!(error instanceof Error)) {
    return 500;
  }

  const message = error.message;
  const isValidationError =
    message.includes("Import session") ||
    message.includes("Unsupported image type") ||
    message.includes("10MB") ||
    message.includes("supports up to 8 images") ||
    message.includes("primaryImageIndex") ||
    message.includes("visibility") ||
    message.includes("familyIds") ||
    message.includes("required") ||
    message.includes("must be");

  return isValidationError ? 400 : 500;
}

export async function GET(request: Request) {
  try {
    const authUser = getAuthUserFromRequest(request);
    const { searchParams } = new URL(request.url);
    const includePrimaryImage = parseBooleanParam(searchParams.get("includePrimaryImage"));
    const includeImages = parseBooleanParam(searchParams.get("includeImages"));
    const recipes = await recipeUseCases.listRecipes(authUser?.userId ?? null, {
      includePrimaryImage,
      includeImages,
    });

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
    let importSessionId: string | null = null;
    try {
      const formData = await request.formData();
      recipeInput = parseRecipePayloadFromFormData(formData);
      images = await parseUploadedImagesFromFormData(formData, "images");
      primaryImageIndex = parseOptionalInt(formData.get("primaryImageIndex"));
      importSessionId = parseOptionalString(formData.get("importSessionId"));
      await validateImportSessionForCreate(authUser.userId, importSessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid multipart payload";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    let createdRecipeId: number | null = null;
    try {
      const recipe = await recipeUseCases.createRecipeWithImages(authUser.userId, {
        recipe: recipeInput,
        images,
        primaryImageIndex,
      });
      createdRecipeId = recipe.id;
      if (importSessionId) {
        await promoteImportSessionSourceDocuments({
          userId: authUser.userId,
          importSessionId,
          recipeId: recipe.id,
        });
      }
      await markImportSessionConfirmed(authUser.userId, importSessionId);

      return NextResponse.json({ recipe }, { status: 201 });
    } catch (error) {
      if (createdRecipeId != null) {
        try {
          await rollbackCreatedRecipe(createdRecipeId);
        } catch (rollbackError) {
          console.error("[recipes.create] rollback failed", {
            recipeId: createdRecipeId,
            message:
              rollbackError instanceof Error
                ? rollbackError.message
                : String(rollbackError),
          });
        }
      }

      const message =
        error instanceof Error ? error.message : "Unexpected error while creating recipe";
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
    if (message === "FORBIDDEN_FAMILY_LINK") {
      return NextResponse.json({ error: "Forbidden family link", code: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
