import { join } from "node:path";
import type { ImageStorageProvider } from "./image-storage-provider";
import { LocalFileStorageProvider } from "./local-file-storage-provider";

const DEFAULT_DRIVER = "local";

export function buildImageStorageProvider(): ImageStorageProvider {
  const driver = process.env.IMAGE_STORAGE_DRIVER ?? DEFAULT_DRIVER;

  switch (driver) {
    case "local":
      return new LocalFileStorageProvider(
        process.env.IMAGE_STORAGE_LOCAL_ROOT ?? join(process.cwd(), "uploads"),
      );
    case "s3":
      throw new Error("S3 storage provider is not implemented yet");
    default:
      throw new Error(`Unsupported image storage driver: ${driver}`);
  }
}
