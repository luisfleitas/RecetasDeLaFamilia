import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  assertSupportedImageMimeType,
  assertSupportedImageSize,
  buildRecipeImageKeys,
  imageConstraints,
  resizeRecipeImage,
} from "../lib/infrastructure/images/image-service";
import { buildImageStorageProvider } from "../lib/infrastructure/images/storage-factory";
import { LocalFileStorageProvider } from "../lib/infrastructure/images/local-file-storage-provider";

test("storage factory returns local provider when IMAGE_STORAGE_DRIVER=local", () => {
  const previousDriver = process.env.IMAGE_STORAGE_DRIVER;
  process.env.IMAGE_STORAGE_DRIVER = "local";

  const provider = buildImageStorageProvider();

  assert.ok(provider instanceof LocalFileStorageProvider);

  process.env.IMAGE_STORAGE_DRIVER = previousDriver;
});

test("image service rejects unsupported mime type", () => {
  assert.throws(
    () => assertSupportedImageMimeType("image/gif"),
    /Unsupported image type/,
  );
});

test("image service rejects files over 10MB", () => {
  assert.throws(
    () => assertSupportedImageSize(imageConstraints.maxImageBytes + 1),
    /10MB/,
  );
});

test("resize output generates 1200x800 full and 400x267 thumb JPEGs", async () => {
  const input = await sharp({
    create: {
      width: 1600,
      height: 1200,
      channels: 3,
      background: { r: 180, g: 90, b: 40 },
    },
  })
    .png()
    .toBuffer();

  const resized = await resizeRecipeImage(input);
  const fullMeta = await sharp(resized.fullBuffer).metadata();
  const thumbMeta = await sharp(resized.thumbnailBuffer).metadata();

  assert.equal(resized.width, 1200);
  assert.equal(resized.height, 800);
  assert.equal(resized.mimeType, "image/jpeg");
  assert.equal(fullMeta.width, 1200);
  assert.equal(fullMeta.height, 800);
  assert.equal(fullMeta.format, "jpeg");
  assert.equal(thumbMeta.width, 400);
  assert.equal(thumbMeta.height, 267);
  assert.equal(thumbMeta.format, "jpeg");
});

test("image keys follow recipe-scoped naming", () => {
  const keys = buildRecipeImageKeys(12, 48);

  assert.equal(keys.fullKey, "recipes/12/img_48.jpg");
  assert.equal(keys.thumbnailKey, "recipes/12/thumb_48.jpg");
});
