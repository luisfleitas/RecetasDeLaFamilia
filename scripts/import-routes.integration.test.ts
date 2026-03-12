import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { signAccessToken } from "../lib/auth/jwt";
import { getPrisma } from "../lib/prisma";

type RouteModule = {
  GET?: (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>;
  POST?: (request: Request, context?: { params: Promise<Record<string, string>> }) => Promise<Response>;
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
  const rootDir = await mkdtemp(join(tmpdir(), "recetas-import-integration-"));
  const dbPath = join(rootDir, "test.db");
  const uploadsDir = join(rootDir, "uploads");

  await applyMigrations(dbPath);

  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.JWT_SECRET = "integration-test-secret";
  process.env.JWT_EXPIRES_IN = "7d";
  process.env.IMAGE_STORAGE_DRIVER = "local";
  process.env.IMAGE_STORAGE_LOCAL_ROOT = uploadsDir;
  process.env.RECIPE_IMPORT_ENABLED = "true";
  process.env.RECIPE_IMPORT_EXTRACTOR_DRIVER = "rule-based";

  (globalThis as { prisma?: unknown }).prisma = undefined;

  return { rootDir };
}

async function loadRouteModule(relativePath: string): Promise<RouteModule> {
  return import(`${relativePath}?t=${Date.now()}-${Math.random()}`) as Promise<RouteModule>;
}

test("import parse route persists session metadata for pasted recipe text", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const prisma = await getPrisma();
    const user = await prisma.user.create({
      data: {
        firstName: "Import",
        lastName: "User",
        email: "import@example.com",
        username: "import-user",
        passwordHash: "hash",
      },
    });

    const token = signAccessToken({ userId: user.id, username: user.username });
    const { POST } = await loadRouteModule("../app/api/recipes/import/parse/route.ts");
    assert.ok(POST);

    const request = new Request("http://localhost/api/recipes/import/parse", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        content: `
Sangria

Ingredients:
- 1 cup wine

Steps:
1. Mix.
`,
      }),
    });

    const response = await POST!(request);
    assert.equal(response.status, 200);

    const payload = (await response.json()) as {
      importSessionId: string;
      providerName?: string | null;
      warnings?: unknown[];
    };
    assert.ok(payload.importSessionId);

    const session = await prisma.importSession.findUnique({
      where: { id: payload.importSessionId },
      select: {
        providerName: true,
        warningsJson: true,
        sourceRefsJson: true,
      },
    });

    assert.equal(session?.providerName, "rule-based");
    assert.ok(session?.warningsJson);
    assert.equal(session?.sourceRefsJson, "[]");
  } finally {
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("source document routes enforce recipe access control", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const prisma = await getPrisma();
    const owner = await prisma.user.create({
      data: {
        firstName: "Owner",
        lastName: "User",
        email: "owner@example.com",
        username: "owner-user",
        passwordHash: "hash",
      },
    });
    const outsider = await prisma.user.create({
      data: {
        firstName: "Outside",
        lastName: "User",
        email: "outside@example.com",
        username: "outside-user",
        passwordHash: "hash",
      },
    });

    const recipe = await prisma.recipe.create({
      data: {
        title: "Private Recipe",
        description: null,
        stepsMarkdown: "1. Keep secret.",
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

    const storageKey = `recipes/${recipe.id}/sources/source.txt`;
    const sourceFilePath = join(rootDir, "uploads", storageKey);
    await mkdir(dirname(sourceFilePath), { recursive: true });
    await writeFile(sourceFilePath, "source document");

    const sourceDocument = await prisma.recipeSourceDocument.create({
      data: {
        recipeId: recipe.id,
        uploadedByUserId: owner.id,
        originalFilename: "source.txt",
        mimeType: "text/plain",
        sizeBytes: 15,
        storageKey,
        sourceType: "txt",
      },
    });

    const ownerToken = signAccessToken({ userId: owner.id, username: owner.username });
    const outsiderToken = signAccessToken({ userId: outsider.id, username: outsider.username });
    const listRoute = await loadRouteModule("../app/api/recipes/[id]/source-documents/route.ts");
    const fileRoute = await loadRouteModule("../app/api/recipes/[id]/source-documents/[docId]/file/route.ts");

    const ownerListResponse = await listRoute.GET!(
      new Request(`http://localhost/api/recipes/${recipe.id}/source-documents`, {
        headers: { authorization: `Bearer ${ownerToken}` },
      }),
      { params: Promise.resolve({ id: String(recipe.id) }) },
    );
    assert.equal(ownerListResponse.status, 200);

    const outsiderListResponse = await listRoute.GET!(
      new Request(`http://localhost/api/recipes/${recipe.id}/source-documents`, {
        headers: { authorization: `Bearer ${outsiderToken}` },
      }),
      { params: Promise.resolve({ id: String(recipe.id) }) },
    );
    assert.equal(outsiderListResponse.status, 404);

    const ownerFileResponse = await fileRoute.GET!(
      new Request(`http://localhost/api/recipes/${recipe.id}/source-documents/${sourceDocument.id}/file`, {
        headers: { authorization: `Bearer ${ownerToken}` },
      }),
      { params: Promise.resolve({ id: String(recipe.id), docId: String(sourceDocument.id) }) },
    );
    assert.equal(ownerFileResponse.status, 200);

    const outsiderFileResponse = await fileRoute.GET!(
      new Request(`http://localhost/api/recipes/${recipe.id}/source-documents/${sourceDocument.id}/file`, {
        headers: { authorization: `Bearer ${outsiderToken}` },
      }),
      { params: Promise.resolve({ id: String(recipe.id), docId: String(sourceDocument.id) }) },
    );
    assert.equal(outsiderFileResponse.status, 404);
  } finally {
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("recipe creation still works without import session", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const prisma = await getPrisma();
    const user = await prisma.user.create({
      data: {
        firstName: "Recipe",
        lastName: "Creator",
        email: "creator@example.com",
        username: "creator-user",
        passwordHash: "hash",
      },
    });

    const token = signAccessToken({ userId: user.id, username: user.username });
    const { POST } = await loadRouteModule("../app/api/recipes/route.ts");
    assert.ok(POST);

    const request = new Request("http://localhost/api/recipes", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "Plain Recipe",
        description: "No import session involved",
        stepsMarkdown: "1. Mix.\n2. Serve.",
        visibility: "private",
        familyIds: [],
        ingredients: [
          {
            name: "salt",
            qty: 1,
            unit: "tsp",
            notes: null,
            position: 1,
          },
        ],
      }),
    });

    const response = await POST!(request);
    assert.equal(response.status, 201);

    const payload = (await response.json()) as { recipe?: { id: number } };
    assert.ok(payload.recipe?.id);

    const recipe = await prisma.recipe.findUnique({
      where: { id: payload.recipe.id },
      include: {
        ingredients: true,
      },
    });

    assert.equal(recipe?.title, "Plain Recipe");
    assert.equal(recipe?.ingredients.length, 1);
    assert.equal(recipe?.ingredients[0]?.name, "salt");

    const importSessions = await prisma.importSession.findMany({
      where: { userId: user.id },
    });
    assert.equal(importSessions.length, 0);
  } finally {
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});
