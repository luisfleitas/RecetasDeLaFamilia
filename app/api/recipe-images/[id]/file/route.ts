import { Readable } from "node:stream";
import { buildImageStorageProvider } from "@/lib/infrastructure/images/storage-factory";
import { buildRecipeUseCases } from "@/lib/recipes/factory";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

const recipeUseCases = buildRecipeUseCases();
const storageProvider = buildImageStorageProvider();

function parseImageId(id: string): number | null {
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const imageId = parseImageId(id);

  if (!imageId) {
    return NextResponse.json({ error: "Invalid image id" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const variant = searchParams.get("variant") === "thumb" ? "thumb" : "full";

  const image = await recipeUseCases.getRecipeImageAssetById(imageId);
  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const key = variant === "thumb" ? image.thumbnailKey : image.storageKey;

  try {
    const nodeStream = await storageProvider.getObjectStream(key);
    const stream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
    return new Response(stream, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image file not found" }, { status: 404 });
  }
}
