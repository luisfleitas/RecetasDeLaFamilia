import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import Database from "better-sqlite3";
import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { signAccessToken } from "../lib/auth/jwt";
import { getPrisma } from "../lib/prisma";

type RouteModule = {
  POST: (request: Request) => Promise<Response>;
};

async function applyMigrations(dbPath: string) {
  const db = new Database(dbPath);
  try {
    const migrationsDir = join(process.cwd(), "prisma", "migrations");
    const entries = (await readdir(migrationsDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const entry of entries) {
      const sql = await readFile(join(migrationsDir, entry, "migration.sql"), "utf8");
      db.exec(sql);
    }
  } finally {
    db.close();
  }
}

async function setupIntegrationEnv() {
  const rootDir = await mkdtemp(join(tmpdir(), "recetas-import-upload-route-"));
  const dbPath = join(rootDir, "test.db");
  const uploadsDir = join(rootDir, "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await applyMigrations(dbPath);

  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.JWT_SECRET = "integration-test-secret";
  process.env.JWT_EXPIRES_IN = "7d";
  process.env.IMAGE_STORAGE_DRIVER = "local";
  process.env.IMAGE_STORAGE_LOCAL_ROOT = uploadsDir;
  process.env.RECIPE_IMPORT_HANDWRITTEN_ENABLED = "true";
  process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";

  (globalThis as { prisma?: unknown }).prisma = undefined;

  return { rootDir };
}

async function loadUploadRoute(): Promise<RouteModule> {
  return import(`../app/api/recipes/import/source-images/upload/route.ts?t=${Date.now()}-${Math.random()}`) as Promise<RouteModule>;
}

async function createUser() {
  const prisma = await getPrisma();
  return prisma.user.create({
    data: {
      firstName: "Upload",
      lastName: "Route",
      email: `upload-route-${Math.random()}@example.com`,
      username: `upload-route-${Math.random().toString(36).slice(2, 10)}`,
      passwordHash: "hash",
    },
  });
}

test("source image upload token generation requires auth", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const route = await loadUploadRoute();
    const response = await route.POST(
      new Request("http://localhost/api/recipes/import/source-images/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "blob.generate-client-token",
          payload: {
            pathname: "imports/staging/batch/page-1.jpg",
            multipart: true,
            clientPayload: JSON.stringify({
              uploadBatchId: "batch",
              clientFileId: "page-1",
              originalFilename: "page.jpg",
              mimeType: "image/jpeg",
              sizeBytes: 1024,
            }),
          },
        }),
      }),
    );

    assert.equal(response.status, 401);
  } finally {
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("source image upload token generation rejects unsupported and over-limit images", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const user = await createUser();
    const token = signAccessToken({ userId: user.id, username: user.username });
    const route = await loadUploadRoute();
    const response = await route.POST(
      new Request("http://localhost/api/recipes/import/source-images/upload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "blob.generate-client-token",
          payload: {
            pathname: "imports/staging/batch/page-1.gif",
            multipart: true,
            clientPayload: JSON.stringify({
              uploadBatchId: "batch",
              clientFileId: "page-1",
              originalFilename: "page.gif",
              mimeType: "image/gif",
              sizeBytes: (10 * 1024 * 1024) + 1,
            }),
          },
        }),
      }),
    );

    assert.equal(response.status, 400);
    const payload = (await response.json()) as { error?: string };
    assert.match(payload.error ?? "", /Unsupported handwritten file type|10MB/);
  } finally {
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("source image upload completion records batch metadata", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const user = await createUser();
    const route = await loadUploadRoute();
    const completedBody = {
      type: "blob.upload-completed",
      payload: {
        blob: {
          url: "https://blob.example/imports/staging/batch/page-1.jpg",
          downloadUrl: "https://blob.example/imports/staging/batch/page-1.jpg",
          pathname: "imports/staging/batch/page-1.jpg",
          contentType: "image/jpeg",
          contentDisposition: "inline",
          size: 1024,
          uploadedAt: new Date().toISOString(),
        },
        tokenPayload: JSON.stringify({
          userId: user.id,
          uploadBatchId: "batch",
          clientFileId: "page-1",
          originalFilename: "page.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1024,
        }),
      },
    };
    const response = await route.POST(
      new Request("http://localhost/api/recipes/import/source-images/upload", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-vercel-signature": createHmac("sha256", "vercel_blob_rw_test")
            .update(JSON.stringify(completedBody))
            .digest("hex"),
          },
        body: JSON.stringify(completedBody),
      }),
    );

    const responsePayload = (await response.json()) as { error?: string };
    assert.equal(response.status, 200, responsePayload.error);
    const prisma = await getPrisma();
    const sourceDocument = await prisma.recipeSourceDocument.findFirst({
      where: { uploadedByUserId: user.id, recipeId: null, importSessionId: null },
      select: { metadataJson: true, storageKey: true, originalFilename: true },
    });
    assert.equal(sourceDocument?.storageKey, "imports/staging/batch/page-1.jpg");
    assert.equal(sourceDocument?.originalFilename, "page.jpg");
    assert.match(sourceDocument?.metadataJson ?? "", /"uploadBatchId":"batch"/);
  } finally {
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});
