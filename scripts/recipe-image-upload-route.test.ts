import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import { signAccessToken } from "../lib/auth/jwt";
import { getPrisma } from "../lib/prisma";

type ImageRouteModule = {
  POST: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
};

const SHARED_UPLOADS_DIR = join(tmpdir(), "recetas-recipe-image-route-uploads");

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
  const rootDir = await mkdtemp(join(tmpdir(), "recetas-recipe-image-route-"));
  const dbPath = join(rootDir, "test.db");
  await rm(SHARED_UPLOADS_DIR, { recursive: true, force: true });
  await mkdir(SHARED_UPLOADS_DIR, { recursive: true });

  await applyMigrations(dbPath);

  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.JWT_SECRET = "integration-test-secret";
  process.env.JWT_EXPIRES_IN = "7d";
  process.env.IMAGE_STORAGE_DRIVER = "local";
  process.env.IMAGE_STORAGE_LOCAL_ROOT = SHARED_UPLOADS_DIR;

  (globalThis as { prisma?: unknown }).prisma = undefined;

  return { rootDir };
}

async function loadImageRouteModule(): Promise<ImageRouteModule> {
  return import(`../app/api/recipes/[id]/images/route.ts?t=${Date.now()}-${Math.random()}`) as Promise<ImageRouteModule>;
}

async function createOwnerRecipe() {
  const prisma = await getPrisma();
  const owner = await prisma.user.create({
    data: {
      firstName: "Image",
      lastName: "Uploader",
      email: `image-uploader-${Math.random()}@example.com`,
      username: `image-uploader-${Math.random().toString(36).slice(2, 10)}`,
      passwordHash: "hash",
    },
  });

  const recipe = await prisma.recipe.create({
    data: {
      title: "Photo Test",
      description: null,
      stepsMarkdown: "1. Save.",
      visibility: "private",
      createdByUserId: owner.id,
      ingredients: {
        create: {
          name: "salt",
          qtyNum: 1,
          qtyDen: 1,
          unit: "tsp",
          notes: null,
          position: 1,
        },
      },
    },
  });

  return { owner, recipe };
}

async function sampleImageFile() {
  const buffer = await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 3,
      background: { r: 120, g: 90, b: 60 },
    },
  })
    .jpeg()
    .toBuffer();

  return new File([buffer], "photo.jpg", { type: "image/jpeg" });
}

test("recipe image upload route stores one image per request", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { owner, recipe } = await createOwnerRecipe();
    const route = await loadImageRouteModule();
    const token = signAccessToken({ userId: owner.id, username: owner.username });
    const formData = new FormData();
    formData.append("image", await sampleImageFile());
    formData.append("makePrimary", "true");

    const response = await route.POST(
      new Request(`http://localhost/api/recipes/${recipe.id}/images`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: formData,
      }),
      { params: Promise.resolve({ id: String(recipe.id) }) },
    );

    assert.equal(response.status, 201);
    const payload = (await response.json()) as {
      image?: { id: number; thumbnailUrl: string };
      recipe?: { primaryImage?: { id: number } | null; images?: Array<{ id: number }> };
    };
    assert.ok(payload.image?.id);
    assert.equal(payload.recipe?.primaryImage?.id, payload.image.id);
    assert.equal(payload.recipe?.images?.length, 1);
  } finally {
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("recipe image upload route rejects over-limit images before decoding", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { owner, recipe } = await createOwnerRecipe();
    const route = await loadImageRouteModule();
    const token = signAccessToken({ userId: owner.id, username: owner.username });
    const formData = new FormData();
    formData.append("image", new File([Buffer.alloc((4 * 1024 * 1024) + 1)], "too-large.jpg", { type: "image/jpeg" }));

    const response = await route.POST(
      new Request(`http://localhost/api/recipes/${recipe.id}/images`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: formData,
      }),
      { params: Promise.resolve({ id: String(recipe.id) }) },
    );

    assert.equal(response.status, 400);
    const payload = (await response.json()) as { error?: string };
    assert.match(payload.error ?? "", /4MB/);
  } finally {
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});
