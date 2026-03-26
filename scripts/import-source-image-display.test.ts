import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { signAccessToken } from "../lib/auth/jwt";
import { getPrisma } from "../lib/prisma";

type RouteModule = {
  GET?: (request: Request, context?: { params: Promise<Record<string, string>> }) => Promise<Response>;
};

const SHARED_UPLOADS_DIR = join(tmpdir(), "recetas-import-source-image-uploads");

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
  const rootDir = await mkdtemp(join(tmpdir(), "recetas-import-source-image-"));
  const dbPath = join(rootDir, "test.db");
  await rm(SHARED_UPLOADS_DIR, { recursive: true, force: true });
  await mkdir(SHARED_UPLOADS_DIR, { recursive: true });

  await applyMigrations(dbPath);

  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.JWT_SECRET = "integration-test-secret";
  process.env.JWT_EXPIRES_IN = "7d";
  process.env.IMAGE_STORAGE_DRIVER = "local";
  process.env.IMAGE_STORAGE_LOCAL_ROOT = SHARED_UPLOADS_DIR;
  process.env.RECIPE_IMPORT_ENABLED = "true";

  (globalThis as { prisma?: unknown }).prisma = undefined;

  return { rootDir };
}

async function loadRouteModule(relativePath: string): Promise<RouteModule> {
  return import(`${relativePath}?t=${Date.now()}-${Math.random()}`) as Promise<RouteModule>;
}

async function createRecipeWithSourceImage(options: {
  visibility: "public" | "private" | "family";
  publiclyVisible: boolean;
  sourceImageVisibility: "private" | "public";
}) {
  const prisma = await getPrisma();
  const owner = await prisma.user.create({
    data: {
      firstName: "Owner",
      lastName: "Viewer",
      email: `owner-${Math.random()}@example.com`,
      username: `owner-${Math.random().toString(36).slice(2, 10)}`,
      passwordHash: "hash",
    },
  });

  const recipe = await prisma.recipe.create({
    data: {
      title: "Handwritten Archive",
      description: null,
      stepsMarkdown: "1. Mix.\n2. Bake.",
      visibility: options.visibility,
      createdByUserId: owner.id,
      ingredients: {
        create: {
          name: "flour",
          qtyNum: 1,
          qtyDen: 1,
          unit: "cup",
          notes: null,
          position: 1,
        },
      },
    },
  });

  if (options.visibility === "family") {
    const family = await prisma.family.create({
      data: {
        name: "Archive Family",
        createdByUserId: owner.id,
      },
    });

    await prisma.recipeFamilyLink.create({
      data: {
        recipeId: recipe.id,
        familyId: family.id,
      },
    });
  }

  const sourceDocument = await prisma.recipeSourceDocument.create({
    data: {
      recipeId: recipe.id,
      uploadedByUserId: owner.id,
      originalFilename: "card-front.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
      storageKey: `recipes/${recipe.id}/sources/card-front.jpg`,
      sourceType: "image",
      metadataJson: JSON.stringify({
        inputMode: "handwritten",
        publiclyVisible: options.publiclyVisible,
        sourceImageVisibility: options.sourceImageVisibility,
      }),
    },
  });

  return { owner, recipe, sourceDocument };
}

test("public handwritten source images are exposed through list and detail image collections for gallery/carousel rendering", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { recipe, sourceDocument } = await createRecipeWithSourceImage({
      visibility: "public",
      publiclyVisible: true,
      sourceImageVisibility: "public",
    });

    const recipesRoute = await loadRouteModule("../app/api/recipes/route.ts");
    const recipeRoute = await loadRouteModule("../app/api/recipes/[id]/route.ts");

    const listResponse = await recipesRoute.GET!(
      new Request("http://localhost/api/recipes?includePrimaryImage=true&includeImages=true"),
    );
    assert.equal(listResponse.status, 200);

    const listPayload = (await listResponse.json()) as {
      recipes: Array<{
        id: number;
        images?: Array<{ thumbnailUrl: string; fullUrl: string }>;
      }>;
    };
    const listedRecipe = listPayload.recipes.find((item) => item.id === recipe.id);
    assert.ok(listedRecipe);
    assert.equal(listedRecipe?.images?.length, 1);
    assert.equal(
      listedRecipe?.images?.[0]?.thumbnailUrl,
      `/api/recipes/${recipe.id}/source-documents/${sourceDocument.id}/file`,
    );
    assert.equal(
      listedRecipe?.images?.[0]?.fullUrl,
      `/api/recipes/${recipe.id}/source-documents/${sourceDocument.id}/file`,
    );

    const detailResponse = await recipeRoute.GET!(
      new Request(`http://localhost/api/recipes/${recipe.id}?includePrimaryImage=true&includeImages=true`),
      { params: Promise.resolve({ id: String(recipe.id) }) },
    );
    assert.equal(detailResponse.status, 200);

    const detailPayload = (await detailResponse.json()) as {
      recipe: {
        id: number;
        images?: Array<{ thumbnailUrl: string; fullUrl: string }>;
      };
    };
    assert.equal(detailPayload.recipe.id, recipe.id);
    assert.equal(detailPayload.recipe.images?.length, 1);
    assert.equal(
      detailPayload.recipe.images?.[0]?.thumbnailUrl,
      `/api/recipes/${recipe.id}/source-documents/${sourceDocument.id}/file`,
    );
  } finally {
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("private handwritten source images stay out of public carousel/gallery data but remain visible to the owner", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { owner, recipe, sourceDocument } = await createRecipeWithSourceImage({
      visibility: "public",
      publiclyVisible: false,
      sourceImageVisibility: "private",
    });

    const ownerToken = signAccessToken({ userId: owner.id, username: owner.username });
    const recipesRoute = await loadRouteModule("../app/api/recipes/route.ts");
    const recipeRoute = await loadRouteModule("../app/api/recipes/[id]/route.ts");

    const publicListResponse = await recipesRoute.GET!(
      new Request("http://localhost/api/recipes?includePrimaryImage=true&includeImages=true"),
    );
    assert.equal(publicListResponse.status, 200);

    const publicListPayload = (await publicListResponse.json()) as {
      recipes: Array<{
        id: number;
        images?: Array<{ thumbnailUrl: string }>;
      }>;
    };
    const publicRecipe = publicListPayload.recipes.find((item) => item.id === recipe.id);
    assert.ok(publicRecipe);
    assert.equal(publicRecipe?.images?.length ?? 0, 0);

    const publicDetailResponse = await recipeRoute.GET!(
      new Request(`http://localhost/api/recipes/${recipe.id}?includePrimaryImage=true&includeImages=true`),
      { params: Promise.resolve({ id: String(recipe.id) }) },
    );
    assert.equal(publicDetailResponse.status, 200);

    const publicDetailPayload = (await publicDetailResponse.json()) as {
      recipe: {
        images?: Array<{ thumbnailUrl: string }>;
      };
    };
    assert.equal(publicDetailPayload.recipe.images?.length ?? 0, 0);

    const ownerListResponse = await recipesRoute.GET!(
      new Request("http://localhost/api/recipes?includePrimaryImage=true&includeImages=true", {
        headers: { authorization: `Bearer ${ownerToken}` },
      }),
    );
    assert.equal(ownerListResponse.status, 200);

    const ownerListPayload = (await ownerListResponse.json()) as {
      recipes: Array<{
        id: number;
        images?: Array<{ thumbnailUrl: string }>;
      }>;
    };
    const ownerRecipe = ownerListPayload.recipes.find((item) => item.id === recipe.id);
    assert.ok(ownerRecipe);
    assert.equal(ownerRecipe?.images?.length, 1);
    assert.equal(
      ownerRecipe?.images?.[0]?.thumbnailUrl,
      `/api/recipes/${recipe.id}/source-documents/${sourceDocument.id}/file`,
    );

    const ownerDetailResponse = await recipeRoute.GET!(
      new Request(`http://localhost/api/recipes/${recipe.id}?includePrimaryImage=true&includeImages=true`, {
        headers: { authorization: `Bearer ${ownerToken}` },
      }),
      { params: Promise.resolve({ id: String(recipe.id) }) },
    );
    assert.equal(ownerDetailResponse.status, 200);

    const ownerDetailPayload = (await ownerDetailResponse.json()) as {
      recipe: {
        images?: Array<{ thumbnailUrl: string }>;
      };
    };
    assert.equal(ownerDetailPayload.recipe.images?.length, 1);
    assert.equal(
      ownerDetailPayload.recipe.images?.[0]?.thumbnailUrl,
      `/api/recipes/${recipe.id}/source-documents/${sourceDocument.id}/file`,
    );
  } finally {
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});
