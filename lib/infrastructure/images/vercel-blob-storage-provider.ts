import { del, get, put, type BlobAccessType } from "@vercel/blob";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import type { ImageStorageProvider, PutObjectInput } from "./image-storage-provider";

type VercelBlobStorageProviderOptions = {
  token?: string;
  access?: BlobAccessType;
  keyPrefix?: string;
  publicBaseUrl?: string;
};

export class VercelBlobStorageProvider implements ImageStorageProvider {
  private readonly token?: string;
  private readonly access: BlobAccessType;
  private readonly keyPrefix: string;
  private readonly publicBaseUrl: string;

  constructor(options: VercelBlobStorageProviderOptions = {}) {
    this.token = options.token;
    this.access = options.access ?? "private";
    this.keyPrefix = normalizePrefix(options.keyPrefix ?? "");
    this.publicBaseUrl = (options.publicBaseUrl ?? "/uploads").replace(/\/$/, "");
  }

  async putObject(input: PutObjectInput): Promise<void> {
    await put(this.toBlobPathname(input.key), input.buffer, {
      access: this.access,
      allowOverwrite: true,
      contentType: input.contentType,
      token: this.token,
    });
  }

  async getObjectStream(key: string): Promise<Readable> {
    const result = await get(this.toBlobPathname(key), {
      access: this.access,
      token: this.token,
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new Error("Blob object not found");
    }

    return Readable.fromWeb(result.stream as NodeReadableStream<Uint8Array>);
  }

  async deleteObject(key: string): Promise<void> {
    await del(this.toBlobPathname(key), {
      token: this.token,
    });
  }

  getPublicUrl(key: string): string {
    const normalized = normalizeKey(key);
    return `${this.publicBaseUrl}/${normalized}`;
  }

  private toBlobPathname(key: string): string {
    const normalized = normalizeKey(key);
    if (this.keyPrefix && normalized.startsWith(this.keyPrefix)) {
      return normalized;
    }

    return `${this.keyPrefix}${normalized}`;
  }
}

function normalizePrefix(prefix: string): string {
  const normalized = prefix.replace(/^\/+|\/+$/g, "");
  return normalized ? `${normalized}/` : "";
}

function normalizeKey(key: string): string {
  const normalized = key.replace(/^\/+/, "");

  if (!normalized || normalized.includes("..")) {
    throw new Error("Unsafe storage key");
  }

  return normalized;
}
