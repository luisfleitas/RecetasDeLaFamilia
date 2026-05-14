import { buildFamilyImageUseCases, type UploadedFamilyImage } from "@/lib/application/families/family-image-use-cases";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  const authUser = await getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let image: UploadedFamilyImage;
  try {
    image = await parseSingleFamilyImage(await request.formData());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid image upload payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const result = await familyImageUseCases.stageFamilyImageForCreate({
      userId: authUser.userId,
      image,
    });

    return NextResponse.json({ image: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while staging family image";
    return NextResponse.json({ error: message }, { status: toErrorStatus(error) });
  }
}
