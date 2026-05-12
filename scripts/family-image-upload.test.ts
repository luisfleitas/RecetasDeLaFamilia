import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdir, mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import { signAccessToken } from "../lib/auth/jwt";
import { getPrisma } from "../lib/prisma";

type StageRouteModule = {
  POST: (request: Request) => Promise<Response>;
};

type FamilyImageRouteModule = {
  PUT: (request: Request, context: { params: Promise<{ familyId: string }> }) => Promise<Response>;
  DELETE: (request: Request, context: { params: Promise<{ familyId: string }> }) => Promise<Response>;
};

const SHARED_UPLOADS_DIR = join(tmpdir(), "recetas-family-image-uploads");

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
  const rootDir = await mkdtemp(join(tmpdir(), "recetas-family-image-route-"));
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

async function loadStageRouteModule(): Promise<StageRouteModule> {
  return import(`../app/api/family-images/route.ts?t=${Date.now()}-${Math.random()}`) as Promise<StageRouteModule>;
}

async function loadFamilyImageRouteModule(): Promise<FamilyImageRouteModule> {
  return import(`../app/api/families/[familyId]/image/route.ts?t=${Date.now()}-${Math.random()}`) as Promise<FamilyImageRouteModule>;
}

async function createFamilyScenario() {
  const prisma = await getPrisma();
  const owner = await prisma.user.create({
    data: {
      firstName: "Family",
      lastName: "Admin",
      email: `family-admin-${Math.random()}@example.com`,
      username: `family-admin-${Math.random().toString(36).slice(2, 10)}`,
      passwordHash: "hash",
    },
  });
  const member = await prisma.user.create({
    data: {
      firstName: "Family",
      lastName: "Member",
      email: `family-member-${Math.random()}@example.com`,
      username: `family-member-${Math.random().toString(36).slice(2, 10)}`,
      passwordHash: "hash",
    },
  });
  const family = await prisma.family.create({
    data: {
      name: "Image Family",
      description: null,
      pictureStorageKey: "family-images/old-avatar.jpg",
      createdByUserId: owner.id,
      memberships: {
        create: [
          { userId: owner.id, role: "admin" },
          { userId: member.id, role: "member" },
        ],
      },
    },
  });

  return { owner, member, family };
}

async function sampleImageFile(type = "image/png", name = "family.png") {
  const buffer = await sharp({
    create: {
      width: 80,
      height: 48,
      channels: 3,
      background: { r: 190, g: 116, b: 68 },
    },
  })
    .png()
    .toBuffer();
  const bytes = new Uint8Array(buffer.length);
  bytes.set(buffer);

  return new File([bytes], name, { type });
}

function authHeader(user: { id: number; username: string }) {
  const token = signAccessToken({ userId: user.id, username: user.username });
  return { authorization: `Bearer ${token}` };
}

async function cleanup(rootDir: string) {
  const prisma = await getPrisma();
  await prisma.$disconnect();
  (globalThis as { prisma?: unknown }).prisma = undefined;
  await rm(rootDir, { recursive: true, force: true });
}

test("family image staging stores square upload metadata under a family-image prefix", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { owner } = await createFamilyScenario();
    const route = await loadStageRouteModule();
    const formData = new FormData();
    formData.append("image", await sampleImageFile());

    const response = await route.POST(
      new Request("http://localhost/api/family-images", {
        method: "POST",
        headers: authHeader(owner),
        body: formData,
      }),
    );

    assert.equal(response.status, 201);
    const payload = (await response.json()) as {
      image?: { storageKey: string; width: number; height: number; pictureUrl: string };
    };
    assert.match(payload.image?.storageKey ?? "", /^family-images\/staged\/user-\d+\/family_/);
    assert.equal(payload.image?.width, 512);
    assert.equal(payload.image?.height, 512);
    assert.equal(payload.image?.pictureUrl, `/uploads/${payload.image?.storageKey}`);
    await stat(join(SHARED_UPLOADS_DIR, payload.image!.storageKey));
  } finally {
    await cleanup(rootDir);
  }
});

test("family image staging rejects unsupported and oversized uploads", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { owner } = await createFamilyScenario();
    const route = await loadStageRouteModule();

    const unsupported = new FormData();
    unsupported.append("image", new File([Buffer.from("not svg")], "family.svg", { type: "image/svg+xml" }));
    const unsupportedResponse = await route.POST(
      new Request("http://localhost/api/family-images", {
        method: "POST",
        headers: authHeader(owner),
        body: unsupported,
      }),
    );

    assert.equal(unsupportedResponse.status, 400);
    assert.match(((await unsupportedResponse.json()) as { error?: string }).error ?? "", /Unsupported image type/);

    const oversized = new FormData();
    oversized.append("image", new File([Buffer.alloc((4 * 1024 * 1024) + 1)], "too-large.jpg", { type: "image/jpeg" }));
    const oversizedResponse = await route.POST(
      new Request("http://localhost/api/family-images", {
        method: "POST",
        headers: authHeader(owner),
        body: oversized,
      }),
    );

    assert.equal(oversizedResponse.status, 400);
    assert.match(((await oversizedResponse.json()) as { error?: string }).error ?? "", /4MB/);
  } finally {
    await cleanup(rootDir);
  }
});

test("family image route lets admins replace and remove images while tolerating cleanup misses", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { owner, family } = await createFamilyScenario();
    const route = await loadFamilyImageRouteModule();
    const replaceForm = new FormData();
    replaceForm.append("image", await sampleImageFile("image/webp", "family.webp"));

    const replaceResponse = await route.PUT(
      new Request(`http://localhost/api/families/${family.id}/image`, {
        method: "PUT",
        headers: authHeader(owner),
        body: replaceForm,
      }),
      { params: Promise.resolve({ familyId: String(family.id) }) },
    );

    assert.equal(replaceResponse.status, 200);
    const replacePayload = (await replaceResponse.json()) as {
      family?: { pictureStorageKey: string; pictureUrl: string };
    };
    assert.match(replacePayload.family?.pictureStorageKey ?? "", new RegExp(`^family-images/${family.id}/family_`));
    assert.equal(replacePayload.family?.pictureUrl, `/uploads/${replacePayload.family?.pictureStorageKey}`);

    const prisma = await getPrisma();
    const replacedFamily = await prisma.family.findUniqueOrThrow({ where: { id: family.id } });
    assert.equal(replacedFamily.pictureStorageKey, replacePayload.family?.pictureStorageKey);

    const removeResponse = await route.DELETE(
      new Request(`http://localhost/api/families/${family.id}/image`, {
        method: "DELETE",
        headers: authHeader(owner),
      }),
      { params: Promise.resolve({ familyId: String(family.id) }) },
    );

    assert.equal(removeResponse.status, 200);
    const removePayload = (await removeResponse.json()) as {
      family?: { pictureStorageKey: string | null; pictureUrl: string | null };
    };
    assert.equal(removePayload.family?.pictureStorageKey, null);
    assert.equal(removePayload.family?.pictureUrl, null);
  } finally {
    await cleanup(rootDir);
  }
});

test("family image route requires authentication and admin membership", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { member, family } = await createFamilyScenario();
    const route = await loadFamilyImageRouteModule();
    const unauthenticatedForm = new FormData();
    unauthenticatedForm.append("image", await sampleImageFile());

    const unauthenticatedResponse = await route.PUT(
      new Request(`http://localhost/api/families/${family.id}/image`, {
        method: "PUT",
        body: unauthenticatedForm,
      }),
      { params: Promise.resolve({ familyId: String(family.id) }) },
    );

    assert.equal(unauthenticatedResponse.status, 401);

    const memberForm = new FormData();
    memberForm.append("image", await sampleImageFile());
    const memberResponse = await route.PUT(
      new Request(`http://localhost/api/families/${family.id}/image`, {
        method: "PUT",
        headers: authHeader(member),
        body: memberForm,
      }),
      { params: Promise.resolve({ familyId: String(family.id) }) },
    );

    assert.equal(memberResponse.status, 403);
  } finally {
    await cleanup(rootDir);
  }
});
