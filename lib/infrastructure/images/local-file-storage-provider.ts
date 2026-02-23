import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { ImageStorageProvider, PutObjectInput } from "./image-storage-provider";

export class LocalFileStorageProvider implements ImageStorageProvider {
  private readonly rootDir: string;
  private readonly publicBaseUrl: string;

  constructor(rootDir: string, publicBaseUrl = "/uploads") {
    this.rootDir = resolve(rootDir);
    this.publicBaseUrl = publicBaseUrl.replace(/\/$/, "");
  }

  async putObject(input: PutObjectInput): Promise<void> {
    const absolutePath = this.resolveSafePath(input.key);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.buffer);
  }

  async getObjectStream(key: string) {
    const absolutePath = this.resolveSafePath(key);
    await stat(absolutePath);
    return createReadStream(absolutePath);
  }

  async deleteObject(key: string): Promise<void> {
    const absolutePath = this.resolveSafePath(key);
    await rm(absolutePath, { force: true });
  }

  getPublicUrl(key: string): string {
    const normalized = key.replace(/^\/+/, "");
    return `${this.publicBaseUrl}/${normalized}`;
  }

  private resolveSafePath(key: string): string {
    const normalized = key.replace(/^\/+/, "");
    const absolutePath = resolve(join(this.rootDir, normalized));
    if (!absolutePath.startsWith(this.rootDir)) {
      throw new Error("Unsafe storage key");
    }

    return absolutePath;
  }
}
