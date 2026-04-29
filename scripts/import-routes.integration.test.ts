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
  PATCH?: (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>;
};

const SHARED_UPLOADS_DIR = join(tmpdir(), "recetas-import-integration-uploads");

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

async function setupIntegrationEnv(options?: {
  recipeImportEnabled?: boolean;
  handwrittenEnabled?: boolean;
  handwrittenPrimaryOcrProvider?: "openai" | "local";
  openAiApiKey?: string;
}) {
  const rootDir = await mkdtemp(join(tmpdir(), "recetas-import-integration-"));
  const dbPath = join(rootDir, "test.db");
  await rm(SHARED_UPLOADS_DIR, { recursive: true, force: true });
  await mkdir(SHARED_UPLOADS_DIR, { recursive: true });

  await applyMigrations(dbPath);

  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.JWT_SECRET = "integration-test-secret";
  process.env.JWT_EXPIRES_IN = "7d";
  process.env.IMAGE_STORAGE_DRIVER = "local";
  process.env.IMAGE_STORAGE_LOCAL_ROOT = SHARED_UPLOADS_DIR;
  process.env.RECIPE_IMPORT_ENABLED = options?.recipeImportEnabled === false ? "false" : "true";
  process.env.RECIPE_IMPORT_EXTRACTOR_DRIVER = "rule-based";
  process.env.RECIPE_IMPORT_HANDWRITTEN_ENABLED = options?.handwrittenEnabled ? "true" : "false";
  process.env.RECIPE_IMPORT_HANDWRITTEN_PRIMARY_OCR_PROVIDER = options?.handwrittenPrimaryOcrProvider ?? "openai";
  process.env.RECIPE_IMPORT_HANDWRITTEN_MAX_IMAGE_COUNT = "6";

  if (options?.openAiApiKey) {
    process.env.OPENAI_API_KEY = options.openAiApiKey;
  } else {
    delete process.env.OPENAI_API_KEY;
  }

  (globalThis as { prisma?: unknown }).prisma = undefined;

  return { rootDir, uploadsDir: SHARED_UPLOADS_DIR };
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
  const { rootDir, uploadsDir } = await setupIntegrationEnv();

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
    const sourceFilePath = join(uploadsDir, storageKey);
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
    assert.equal(recipe?.language, "en");
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

test("import routes return 404 when recipe import feature flag is disabled", async () => {
  const { rootDir } = await setupIntegrationEnv({ recipeImportEnabled: false });

  try {
    const prisma = await getPrisma();
    const user = await prisma.user.create({
      data: {
        firstName: "Feature",
        lastName: "Gate",
        email: "feature-gate@example.com",
        username: "feature-gate-user",
        passwordHash: "hash",
      },
    });

    const token = signAccessToken({ userId: user.id, username: user.username });
    const parseRoute = await loadRouteModule("../app/api/recipes/import/parse/route.ts");
    const sessionRoute = await loadRouteModule("../app/api/recipes/import/sessions/[sessionId]/route.ts");

    const parseResponse = await parseRoute.POST!(
      new Request("http://localhost/api/recipes/import/parse", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ content: "Toast" }),
      }),
    );
    assert.equal(parseResponse.status, 404);

    const getResponse = await sessionRoute.GET!(
      new Request("http://localhost/api/recipes/import/sessions/test-session", {
        headers: { authorization: `Bearer ${token}` },
      }),
      { params: Promise.resolve({ sessionId: "test-session" }) },
    );
    assert.equal(getResponse.status, 404);
  } finally {
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("file import can be edited, hydrated, and promoted on recipe create", async () => {
  const { rootDir, uploadsDir } = await setupIntegrationEnv();

  try {
    const prisma = await getPrisma();
    const user = await prisma.user.create({
      data: {
        firstName: "Import",
        lastName: "Flow",
        email: "import-flow@example.com",
        username: "import-flow-user",
        passwordHash: "hash",
      },
    });

    const token = signAccessToken({ userId: user.id, username: user.username });
    const parseRoute = await loadRouteModule("../app/api/recipes/import/parse/route.ts");
    const sessionRoute = await loadRouteModule("../app/api/recipes/import/sessions/[sessionId]/route.ts");
    const recipesRoute = await loadRouteModule("../app/api/recipes/route.ts");

    const importFormData = new FormData();
    importFormData.append(
      "file",
      new File(
        [
          `
Toast

Ingredients:
- 1 slice bread

Steps:
1. Toast bread.
`,
        ],
        "toast.txt",
        { type: "text/plain" },
      ),
    );

    const parseResponse = await parseRoute.POST!(
      new Request("http://localhost/api/recipes/import/parse", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: importFormData,
      }),
    );
    assert.equal(parseResponse.status, 200);

    const parsePayload = (await parseResponse.json()) as {
      importSessionId: string;
      draft: {
        title: string;
        description: string | null;
        stepsMarkdown: string;
        ingredients: Array<{
          name: string;
          qty: number;
          unit: string;
          notes: string | null;
          position: number;
        }>;
      };
      sourceRefs: Array<{
        storageKey?: string;
        originalFilename: string;
      }>;
    };

    assert.ok(parsePayload.importSessionId);
    assert.equal(parsePayload.sourceRefs.length, 1);
    assert.equal(parsePayload.sourceRefs[0]?.originalFilename, "toast.txt");

    const stagedStorageKey = parsePayload.sourceRefs[0]?.storageKey;
    assert.ok(stagedStorageKey);
    const stagedFilePath = join(uploadsDir, stagedStorageKey!);
    const stagedContents = await readFile(stagedFilePath, "utf8");
    assert.match(stagedContents, /Toast/);

    const patchPayload = {
      draft: {
        ...parsePayload.draft,
        title: "Edited Toast",
        ingredients: [
          {
            ...parsePayload.draft.ingredients[0],
            notes: "buttered",
          },
        ],
      },
    };

    const patchResponse = await sessionRoute.PATCH!(
      new Request(`http://localhost/api/recipes/import/sessions/${parsePayload.importSessionId}`, {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(patchPayload),
      }),
      { params: Promise.resolve({ sessionId: parsePayload.importSessionId }) },
    );
    assert.equal(patchResponse.status, 200);

    const getResponse = await sessionRoute.GET!(
      new Request(`http://localhost/api/recipes/import/sessions/${parsePayload.importSessionId}`, {
        headers: { authorization: `Bearer ${token}` },
      }),
      { params: Promise.resolve({ sessionId: parsePayload.importSessionId }) },
    );
    assert.equal(getResponse.status, 200);

    const hydratedPayload = (await getResponse.json()) as {
      draft: {
        title: string;
        language: string;
        ingredients: Array<{ notes: string | null }>;
      };
    };
    assert.equal(hydratedPayload.draft.title, "Edited Toast");
    assert.equal(hydratedPayload.draft.language, "en");
    assert.equal(hydratedPayload.draft.ingredients[0]?.notes, "buttered");

    const createFormData = new FormData();
    createFormData.append(
      "recipe",
      JSON.stringify({
        title: "Edited Toast",
        description: null,
        stepsMarkdown: "1. Toast bread.",
        language: "es",
        visibility: "private",
        familyIds: [],
        ingredients: [
          {
            name: "bread",
            qty: 1,
            unit: "slice",
            notes: "buttered",
            position: 1,
          },
        ],
      }),
    );
    createFormData.append("importSessionId", parsePayload.importSessionId);

    const createResponse = await recipesRoute.POST!(
      new Request("http://localhost/api/recipes", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: createFormData,
      }),
    );
    assert.equal(createResponse.status, 201);

    const createPayload = (await createResponse.json()) as { recipe?: { id: number } };
    assert.ok(createPayload.recipe?.id);

    const createdRecipe = await prisma.recipe.findUnique({
      where: { id: createPayload.recipe.id },
      select: {
        language: true,
      },
    });
    assert.equal(createdRecipe?.language, "es");

    const confirmedSession = await prisma.importSession.findUnique({
      where: { id: parsePayload.importSessionId },
      select: { status: true },
    });
    assert.equal(confirmedSession?.status, "CONFIRMED");

    const sourceDocuments = await prisma.recipeSourceDocument.findMany({
      where: { importSessionId: parsePayload.importSessionId },
      select: {
        recipeId: true,
        storageKey: true,
        originalFilename: true,
      },
    });
    assert.equal(sourceDocuments.length, 1);
    assert.equal(sourceDocuments[0]?.recipeId, createPayload.recipe?.id);
    assert.equal(sourceDocuments[0]?.originalFilename, "toast.txt");
    assert.match(
      sourceDocuments[0]?.storageKey ?? "",
      new RegExp(`^recipes/${createPayload.recipe?.id}/sources/`),
    );

    const finalFilePath = join(uploadsDir, sourceDocuments[0]!.storageKey);
    const finalContents = await readFile(finalFilePath, "utf8");
    assert.match(finalContents, /Toast/);

    await assert.rejects(readFile(stagedFilePath, "utf8"));
  } finally {
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("handwritten multi-image parse preserves upload order and metadata", async () => {
  const { rootDir, uploadsDir } = await setupIntegrationEnv({
    handwrittenEnabled: true,
    handwrittenPrimaryOcrProvider: "openai",
    openAiApiKey: "test-openai-key",
  });

  const originalFetch = globalThis.fetch;

  try {
    const prisma = await getPrisma();
    const user = await prisma.user.create({
      data: {
        firstName: "Handwritten",
        lastName: "Parse",
        email: "handwritten-parse@example.com",
        username: "handwritten-parse-user",
        passwordHash: "hash",
      },
    });

    const ocrTexts = ["Grandma Pie\nIngredients:\n- apples", "Steps:\n1. Bake until golden"];
    let fetchCallCount = 0;
    globalThis.fetch = (async () => {
      const text = ocrTexts[fetchCallCount] ?? "";
      fetchCallCount += 1;

      return new Response(
        JSON.stringify({
          output_text: text,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }) as typeof fetch;

    const token = signAccessToken({ userId: user.id, username: user.username });
    const parseRoute = await loadRouteModule("../app/api/recipes/import/parse/route.ts");

    const importFormData = new FormData();
    importFormData.append("inputMode", "handwritten");
    importFormData.append("files", new File(["front image bytes"], "card-front.jpg", { type: "image/jpeg" }));
    importFormData.append("files", new File(["back image bytes"], "card-back.png", { type: "image/png" }));

    const parseResponse = await parseRoute.POST!(
      new Request("http://localhost/api/recipes/import/parse", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: importFormData,
      }),
    );
    assert.equal(parseResponse.status, 200);

    const parsePayload = (await parseResponse.json()) as {
      importSessionId: string;
      metadata: {
        inputMode: string;
        handwritten: {
          imageCount: number;
          pageOrder: string[];
          ocrProviderUsed: string | null;
          ocrFallbackUsed: boolean;
          ocrProvidersByImage: string[];
          sourceImageVisibility: string;
          reviewHints: string[];
          combinedInUploadOrder: boolean;
        } | null;
      };
      sourceRefs: Array<{
        originalFilename: string;
        mimeType: string;
        storageKey?: string;
      }>;
      draft: {
        title: string;
        ingredients: Array<{ name: string }>;
        stepsMarkdown: string;
      };
    };

    assert.equal(fetchCallCount, 2);
    assert.ok(parsePayload.importSessionId);
    assert.equal(parsePayload.metadata.inputMode, "handwritten");
    assert.equal(parsePayload.metadata.handwritten?.imageCount, 2);
    assert.deepEqual(parsePayload.metadata.handwritten?.pageOrder, ["card-front.jpg", "card-back.png"]);
    assert.equal(parsePayload.metadata.handwritten?.ocrProviderUsed, "openai");
    assert.equal(parsePayload.metadata.handwritten?.ocrFallbackUsed, false);
    assert.deepEqual(parsePayload.metadata.handwritten?.ocrProvidersByImage, ["openai", "openai"]);
    assert.equal(parsePayload.metadata.handwritten?.sourceImageVisibility, "private");
    assert.equal(parsePayload.metadata.handwritten?.combinedInUploadOrder, true);
    assert.ok(parsePayload.metadata.handwritten?.reviewHints.some((hint) => hint.includes("merged")));
    assert.deepEqual(
      parsePayload.sourceRefs.map((sourceRef) => sourceRef.originalFilename),
      ["card-front.jpg", "card-back.png"],
    );
    assert.equal(parsePayload.sourceRefs[0]?.mimeType, "image/jpeg");
    assert.equal(parsePayload.sourceRefs[1]?.mimeType, "image/png");
    assert.equal(parsePayload.draft.title, "Page 1");
    assert.equal(parsePayload.draft.ingredients[0]?.name, "apples");
    assert.match(parsePayload.draft.stepsMarkdown, /Bake until golden/);

    const stagedPaths = parsePayload.sourceRefs.map((sourceRef) => join(uploadsDir, sourceRef.storageKey!));
    const stagedContents = await Promise.all(stagedPaths.map((path) => readFile(path, "utf8")));
    assert.equal(stagedContents[0], "front image bytes");
    assert.equal(stagedContents[1], "back image bytes");

    const storedSession = await prisma.importSession.findUnique({
      where: { id: parsePayload.importSessionId },
      select: {
        sourceRefsJson: true,
        metadataJson: true,
      },
    });
    assert.ok(storedSession?.metadataJson);
    assert.ok(storedSession?.sourceRefsJson);

    const storedMetadata = JSON.parse(storedSession.metadataJson!) as {
      inputMode?: string;
      handwritten?: {
        pageOrder?: string[];
        ocrFallbackUsed?: boolean;
        ocrProvidersByImage?: string[];
        sourceImageVisibility?: string;
      };
    };
    const storedSourceRefs = JSON.parse(storedSession.sourceRefsJson!) as Array<{ originalFilename?: string }>;

    assert.equal(storedMetadata.inputMode, "handwritten");
    assert.deepEqual(storedMetadata.handwritten?.pageOrder, ["card-front.jpg", "card-back.png"]);
    assert.equal(storedMetadata.handwritten?.ocrFallbackUsed, false);
    assert.deepEqual(storedMetadata.handwritten?.ocrProvidersByImage, ["openai", "openai"]);
    assert.equal(storedMetadata.handwritten?.sourceImageVisibility, "private");
    assert.deepEqual(
      storedSourceRefs.map((sourceRef) => sourceRef.originalFilename),
      ["card-front.jpg", "card-back.png"],
    );
  } finally {
    globalThis.fetch = originalFetch;
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("handwritten parse adds weak-result review hints for sparse OCR output", async () => {
  const { rootDir } = await setupIntegrationEnv({
    handwrittenEnabled: true,
    handwrittenPrimaryOcrProvider: "openai",
    openAiApiKey: "test-openai-key",
  });

  const originalFetch = globalThis.fetch;

  try {
    const prisma = await getPrisma();
    const user = await prisma.user.create({
      data: {
        firstName: "Handwritten",
        lastName: "Hints",
        email: "handwritten-hints@example.com",
        username: "handwritten-hints-user",
        passwordHash: "hash",
      },
    });

    const ocrTexts = ["Pie\nIngredients:\n- egg", "Steps:\n1. Mix"];
    let fetchCallCount = 0;
    globalThis.fetch = (async () => {
      const text = ocrTexts[fetchCallCount] ?? "";
      fetchCallCount += 1;

      return new Response(
        JSON.stringify({
          output_text: text,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }) as typeof fetch;

    const token = signAccessToken({ userId: user.id, username: user.username });
    const parseRoute = await loadRouteModule("../app/api/recipes/import/parse/route.ts");

    const importFormData = new FormData();
    importFormData.append("inputMode", "handwritten");
    importFormData.append("files", new File(["front image bytes"], "card-front.jpg", { type: "image/jpeg" }));
    importFormData.append("files", new File(["back image bytes"], "card-back.png", { type: "image/png" }));

    const parseResponse = await parseRoute.POST!(
      new Request("http://localhost/api/recipes/import/parse", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: importFormData,
      }),
    );
    assert.equal(parseResponse.status, 200);

    const parsePayload = (await parseResponse.json()) as {
      metadata?: {
        handwritten?: {
          reviewHints?: string[];
        } | null;
      } | null;
    };

    assert.equal(fetchCallCount, 2);
    assert.ok(
      parsePayload.metadata?.handwritten?.reviewHints?.some((hint) => hint.includes("Very little text was detected")),
    );
    assert.ok(
      parsePayload.metadata?.handwritten?.reviewHints?.some((hint) => hint.includes("page 1") && hint.includes("page 2")),
    );
  } finally {
    globalThis.fetch = originalFetch;
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("handwritten parse falls back to a provisional draft when OCR text cannot produce ingredients", async () => {
  const { rootDir } = await setupIntegrationEnv({
    handwrittenEnabled: true,
    handwrittenPrimaryOcrProvider: "openai",
    openAiApiKey: "test-openai-key",
  });

  const originalFetch = globalThis.fetch;

  try {
    const prisma = await getPrisma();
    const user = await prisma.user.create({
      data: {
        firstName: "Handwritten",
        lastName: "Fallback",
        email: "handwritten-fallback@example.com",
        username: "handwritten-fallback-user",
        passwordHash: "hash",
      },
    });

    const ocrTexts = [
      "Pole tert nla.\nOng. teta\nATRIO",
      "ee\nler",
    ];
    let fetchCallCount = 0;
    globalThis.fetch = (async () => {
      const text = ocrTexts[fetchCallCount] ?? "";
      fetchCallCount += 1;

      return new Response(
        JSON.stringify({
          output_text: text,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }) as typeof fetch;

    const token = signAccessToken({ userId: user.id, username: user.username });
    const parseRoute = await loadRouteModule("../app/api/recipes/import/parse/route.ts");

    const importFormData = new FormData();
    importFormData.append("inputMode", "handwritten");
    importFormData.append("files", new File(["front image bytes"], "card-front.jpg", { type: "image/jpeg" }));
    importFormData.append("files", new File(["back image bytes"], "card-back.png", { type: "image/png" }));

    const parseResponse = await parseRoute.POST!(
      new Request("http://localhost/api/recipes/import/parse", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: importFormData,
      }),
    );
    assert.equal(parseResponse.status, 200);

    const parsePayload = (await parseResponse.json()) as {
      providerName?: string | null;
      promptVersion?: string | null;
      draft: {
        title: string;
        ingredients: Array<unknown>;
        stepsMarkdown: string;
      };
      metadata?: {
        handwritten?: {
          reviewHints?: string[];
        } | null;
      } | null;
    };

    assert.equal(fetchCallCount, 2);
    assert.equal(parsePayload.providerName, "rule-based");
    assert.equal(parsePayload.promptVersion, "handwritten-fallback-v1");
    assert.equal(parsePayload.draft.title, "Pole tert nla.");
    assert.equal(parsePayload.draft.ingredients.length, 0);
    assert.match(parsePayload.draft.stepsMarkdown, /1\. Ong\. teta/i);
    assert.ok(
      parsePayload.metadata?.handwritten?.reviewHints?.some((hint) =>
        hint.includes("add ingredients manually before continuing"),
      ),
    );
  } finally {
    globalThis.fetch = originalFetch;
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("document text-file parse keeps document metadata and avoids handwritten state", async () => {
  const { rootDir, uploadsDir } = await setupIntegrationEnv({
    handwrittenEnabled: true,
  });

  try {
    const prisma = await getPrisma();
    const user = await prisma.user.create({
      data: {
        firstName: "Document",
        lastName: "Regression",
        email: "document-regression@example.com",
        username: "document-regression-user",
        passwordHash: "hash",
      },
    });

    const token = signAccessToken({ userId: user.id, username: user.username });
    const parseRoute = await loadRouteModule("../app/api/recipes/import/parse/route.ts");

    const importFormData = new FormData();
    importFormData.append(
      "file",
      new File(
        [
          `Tomato Soup

Ingredients:
- 2 tomatoes

Steps:
1. Simmer.
`,
        ],
        "tomato-soup.txt",
        { type: "text/plain" },
      ),
    );

    const parseResponse = await parseRoute.POST!(
      new Request("http://localhost/api/recipes/import/parse", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: importFormData,
      }),
    );
    assert.equal(parseResponse.status, 200);

    const parsePayload = (await parseResponse.json()) as {
      importSessionId: string;
      metadata: {
        inputMode: string;
        handwritten: unknown;
      };
      sourceRefs: Array<{
        originalFilename: string;
        mimeType: string;
        sourceType: string;
        storageKey?: string;
      }>;
      draft: {
        title: string;
        ingredients: Array<{ name: string }>;
        stepsMarkdown: string;
      };
    };

    assert.ok(parsePayload.importSessionId);
    assert.equal(parsePayload.metadata.inputMode, "document");
    assert.equal(parsePayload.metadata.handwritten, null);
    assert.equal(parsePayload.sourceRefs.length, 1);
    assert.equal(parsePayload.sourceRefs[0]?.originalFilename, "tomato-soup.txt");
    assert.equal(parsePayload.sourceRefs[0]?.mimeType, "text/plain");
    assert.equal(parsePayload.sourceRefs[0]?.sourceType, "txt");
    assert.equal(parsePayload.draft.title, "Tomato Soup");
    assert.equal(parsePayload.draft.ingredients[0]?.name, "tomatoes");
    assert.match(parsePayload.draft.stepsMarkdown, /Simmer/);

    const stagedFile = join(uploadsDir, parsePayload.sourceRefs[0]!.storageKey!);
    const stagedContents = await readFile(stagedFile, "utf8");
    assert.match(stagedContents, /Tomato Soup/);

    const storedSession = await prisma.importSession.findUnique({
      where: { id: parsePayload.importSessionId },
      select: {
        metadataJson: true,
      },
    });
    assert.ok(storedSession?.metadataJson);

    const storedMetadata = JSON.parse(storedSession.metadataJson!) as {
      inputMode?: string;
      handwritten?: unknown;
      sourceRefs?: Array<{ originalFilename?: string; sourceType?: string }>;
    };

    assert.equal(storedMetadata.inputMode, "document");
    assert.equal(storedMetadata.handwritten, null);
    assert.equal(storedMetadata.sourceRefs?.[0]?.originalFilename, "tomato-soup.txt");
    assert.equal(storedMetadata.sourceRefs?.[0]?.sourceType, "txt");
  } finally {
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("handwritten session GET and PATCH preserve metadata and update source-image visibility", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const prisma = await getPrisma();
    const user = await prisma.user.create({
      data: {
        firstName: "Handwritten",
        lastName: "Session",
        email: "handwritten-session@example.com",
        username: "handwritten-session-user",
        passwordHash: "hash",
      },
    });

    const importSession = await prisma.importSession.create({
      data: {
        userId: user.id,
        status: "PARSED",
        draftJson: JSON.stringify({
          title: "Grandma Cake",
          description: null,
          stepsMarkdown: "1. Stir.\n2. Bake.",
          ingredients: [
            {
              name: "flour",
              qty: 2,
              unit: "cups",
              notes: null,
              position: 1,
            },
          ],
        }),
        warningsJson: JSON.stringify([
          {
            code: "TITLE_MISSING",
            field: "title",
            message: "Review title carefully.",
          },
        ]),
        sourceRefsJson: JSON.stringify([
          {
            sourceType: "image",
            originalFilename: "card-front.jpg",
            mimeType: "image/jpeg",
            sizeBytes: 2048,
            storageKey: "imports/staging/test/card-front.jpg",
          },
          {
            sourceType: "image",
            originalFilename: "card-back.jpg",
            mimeType: "image/jpeg",
            sizeBytes: 2048,
            storageKey: "imports/staging/test/card-back.jpg",
          },
        ]),
        metadataJson: JSON.stringify({
          inputMode: "handwritten",
          warnings: [
            {
              code: "TITLE_MISSING",
              field: "title",
              message: "Review title carefully.",
            },
          ],
          sourceRefs: [
            {
              sourceType: "image",
              originalFilename: "card-front.jpg",
              mimeType: "image/jpeg",
              sizeBytes: 2048,
              storageKey: "imports/staging/test/card-front.jpg",
            },
            {
              sourceType: "image",
              originalFilename: "card-back.jpg",
              mimeType: "image/jpeg",
              sizeBytes: 2048,
              storageKey: "imports/staging/test/card-back.jpg",
            },
          ],
          providerName: "rule-based",
          providerModel: null,
          promptVersion: "v1",
          handwritten: {
            imageCount: 2,
            pageOrder: ["card-front.jpg", "card-back.jpg"],
            ocrProviderUsed: "local",
            ocrProvidersByImage: ["local", "local"],
            sourceImageVisibility: "private",
            reviewHints: [
              "Review carefully before continuing. Handwritten recipes can produce ambiguous text.",
            ],
            combinedInUploadOrder: true,
          },
        }),
        providerName: "rule-based",
        providerModel: null,
        promptVersion: "v1",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const token = signAccessToken({ userId: user.id, username: user.username });
    const sessionRoute = await loadRouteModule("../app/api/recipes/import/sessions/[sessionId]/route.ts");

    const getResponse = await sessionRoute.GET!(
      new Request(`http://localhost/api/recipes/import/sessions/${importSession.id}`, {
        headers: { authorization: `Bearer ${token}` },
      }),
      { params: Promise.resolve({ sessionId: importSession.id }) },
    );
    assert.equal(getResponse.status, 200);

    const getPayload = (await getResponse.json()) as {
      metadata: {
        inputMode: string;
        handwritten: {
          imageCount: number;
          pageOrder: string[];
          sourceImageVisibility: string;
          ocrProvidersByImage: string[];
        } | null;
      } | null;
      sourceRefs: Array<{ originalFilename: string }>;
    };

    assert.equal(getPayload.metadata?.inputMode, "handwritten");
    assert.equal(getPayload.metadata?.handwritten?.imageCount, 2);
    assert.deepEqual(getPayload.metadata?.handwritten?.pageOrder, ["card-front.jpg", "card-back.jpg"]);
    assert.equal(getPayload.metadata?.handwritten?.sourceImageVisibility, "private");
    assert.deepEqual(getPayload.metadata?.handwritten?.ocrProvidersByImage, ["local", "local"]);
    assert.deepEqual(
      getPayload.sourceRefs.map((sourceRef) => sourceRef.originalFilename),
      ["card-front.jpg", "card-back.jpg"],
    );

    const patchResponse = await sessionRoute.PATCH!(
      new Request(`http://localhost/api/recipes/import/sessions/${importSession.id}`, {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          draft: {
            title: "Grandma Cake",
            description: "Family favorite",
            stepsMarkdown: "1. Stir.\n2. Bake.",
            ingredients: [
              {
                name: "flour",
                qty: 2,
                unit: "cups",
                notes: "sifted",
              },
            ],
          },
          metadata: {
            handwritten: {
              sourceImageVisibility: "public",
            },
          },
        }),
      }),
      { params: Promise.resolve({ sessionId: importSession.id }) },
    );
    assert.equal(patchResponse.status, 200);

    const updatedSession = await prisma.importSession.findUnique({
      where: { id: importSession.id },
      select: {
        metadataJson: true,
        draftJson: true,
      },
    });
    assert.ok(updatedSession?.metadataJson);
    assert.ok(updatedSession?.draftJson);

    const updatedMetadata = JSON.parse(updatedSession!.metadataJson!) as {
      handwritten?: { sourceImageVisibility?: string; pageOrder?: string[] };
    };
    assert.equal(updatedMetadata.handwritten?.sourceImageVisibility, "public");
    assert.deepEqual(updatedMetadata.handwritten?.pageOrder, ["card-front.jpg", "card-back.jpg"]);

    const updatedDraft = JSON.parse(updatedSession!.draftJson) as {
      description: string | null;
      ingredients: Array<{ notes: string | null }>;
    };
    assert.equal(updatedDraft.description, "Family favorite");
    assert.equal(updatedDraft.ingredients[0]?.notes, "sifted");
  } finally {
    const prisma = await getPrisma();
    await prisma.$disconnect();
    (globalThis as { prisma?: unknown }).prisma = undefined;
    await rm(rootDir, { recursive: true, force: true });
  }
});
