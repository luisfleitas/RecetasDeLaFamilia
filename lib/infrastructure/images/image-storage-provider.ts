import { Readable } from "node:stream";

export type PutObjectInput = {
  key: string;
  buffer: Buffer;
  contentType: string;
};

export interface ImageStorageProvider {
  putObject(input: PutObjectInput): Promise<void>;
  getObjectStream(key: string): Promise<Readable>;
  deleteObject(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
