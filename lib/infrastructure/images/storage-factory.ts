import { join } from "node:path";
import type { ImageStorageProvider } from "./image-storage-provider";
import { LocalFileStorageProvider } from "./local-file-storage-provider";
import { VercelBlobStorageProvider } from "./vercel-blob-storage-provider";

const DEFAULT_DRIVER = "local";
const BLOB_DRIVERS = new Set(["blob", "vercel-blob"]);

export function resolveImageStorageDriver(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  const configuredDriver = env.IMAGE_STORAGE_DRIVER?.trim();
  if (configuredDriver) {
    return configuredDriver;
  }

  // Vercel function bundles are immutable, so hosted uploads must not fall back to process.cwd()/uploads.
  return env.VERCEL ? "vercel-blob" : DEFAULT_DRIVER;
}

export function usesBlobImageStorage(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return BLOB_DRIVERS.has(resolveImageStorageDriver(env));
}

export function buildImageStorageProvider(): ImageStorageProvider {
  const driver = resolveImageStorageDriver();

  if (BLOB_DRIVERS.has(driver)) {
    return new VercelBlobStorageProvider({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      access: process.env.IMAGE_STORAGE_BLOB_ACCESS === "public" ? "public" : "private",
      keyPrefix: process.env.IMAGE_STORAGE_BLOB_PREFIX,
      publicBaseUrl: process.env.IMAGE_STORAGE_BLOB_PUBLIC_BASE_URL,
    });
  }

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
