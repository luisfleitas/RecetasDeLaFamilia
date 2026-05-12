import { parsePositiveInt } from "@/lib/application/families/validation";
import { buildFamilyImageUseCases, type UploadedFamilyImage } from "@/lib/application/families/family-image-use-cases";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ familyId: string }>;
};

const familyImageUseCases = buildFamilyImageUseCases();

function toErrorStatus(error: unknown): number {
  if (!(error instanceof Error)) {
    return 500;
  }

  const message = error.message;
  return message.includes("Unsupported image type") || message.includes("4MB") || message.includes("must be")
    ? 400
    : 500;
}

async function parseSingleFamilyImage(formData: FormData): Promise<UploadedFamilyImage> {
  const file = formData.get("image");
  if (!(file instanceof File)) {
    throw new Error("Image file is required.");
  }

  return {
    originalFilename: file.name || "family-image",
    mimeType: file.type,
    sizeBytes: file.size,
    buffer: Buffer.from(await file.arrayBuffer()),
  };
}

async function parseFamilyId(params: Params["params"]) {
  const { familyId: rawFamilyId } = await params;
  return parsePositiveInt(rawFamilyId);
}

export async function PUT(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = await parseFamilyId(params);
  if (!familyId) {
    return NextResponse.json({ error: "Invalid family id" }, { status: 400 });
  }

  let image: UploadedFamilyImage;
  try {
    image = await parseSingleFamilyImage(await request.formData());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid image upload payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const result = await familyImageUseCases.replaceFamilyImage({
      familyId,
      userId: authUser.userId,
      image,
    });

    if (result.forbidden) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!result.family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    return NextResponse.json({ family: result.family });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while replacing family image";
    return NextResponse.json({ error: message }, { status: toErrorStatus(error) });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const familyId = await parseFamilyId(params);
  if (!familyId) {
    return NextResponse.json({ error: "Invalid family id" }, { status: 400 });
  }

  try {
    const result = await familyImageUseCases.removeFamilyImage({
      familyId,
      userId: authUser.userId,
    });

    if (result.forbidden) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!result.family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    return NextResponse.json({ family: result.family });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while removing family image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
