import { getCompletedAuthUserFromRequest } from "@/lib/auth/request-auth";
import type { UploadedRecipeImage } from "@/lib/application/recipes/use-cases";
import { buildRecipeUseCases } from "@/lib/recipes/factory";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

const recipeUseCases = buildRecipeUseCases();

function parsePositiveInt(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseBooleanFormValue(value: FormDataEntryValue | null): boolean {
  return value === "true" || value === "1";
}

function toErrorStatus(error: unknown): number {
  if (!(error instanceof Error)) {
    return 500;
  }

  const message = error.message;
  const isValidationError =
    message.includes("Unsupported image type") ||
    message.includes("4MB") ||
    message.includes("supports up to 8 images") ||
    message.includes("must be");

  return isValidationError ? 400 : 500;
}

async function parseSingleImage(formData: FormData): Promise<UploadedRecipeImage> {
  const file = formData.get("image");
  if (!(file instanceof File)) {
    throw new Error("Image file is required.");
  }

  return {
    originalFilename: file.name || "image",
    mimeType: file.type,
    sizeBytes: file.size,
    buffer: Buffer.from(await file.arrayBuffer()),
  };
}

export async function POST(request: Request, { params }: Params) {
  const authResult = await getCompletedAuthUserFromRequest(request);


  if (authResult.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }

  if (authResult.status === "profile_incomplete") {

    return authResult.response;

  }

  const authUser = authResult.authUser;

  const { id: rawRecipeId } = await params;
  const recipeId = parsePositiveInt(rawRecipeId);
  if (!recipeId) {
    return NextResponse.json({ error: "Invalid recipe id" }, { status: 400 });
  }

  let image: UploadedRecipeImage;
  let makePrimary = false;
  try {
    const formData = await request.formData();
    image = await parseSingleImage(formData);
    makePrimary = parseBooleanFormValue(formData.get("makePrimary"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid image upload payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const result = await recipeUseCases.addRecipeImage(authUser.userId, recipeId, {
      image,
      makePrimary,
    });

    if (result.forbidden) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!result.recipe || !result.image) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        image: result.image,
        recipe: result.recipe,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while uploading image";
    return NextResponse.json({ error: message }, { status: toErrorStatus(error) });
  }
}
