import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { signAccessToken } from "../lib/auth/jwt";
import { getPrisma } from "../lib/prisma";

type FamiliesRouteModule = {
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
  const rootDir = await mkdtemp(join(tmpdir(), "recetas-create-family-route-"));
  const dbPath = join(rootDir, "test.db");

  await applyMigrations(dbPath);

  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.JWT_SECRET = "integration-test-secret";
  process.env.JWT_EXPIRES_IN = "7d";

  (globalThis as { prisma?: unknown }).prisma = undefined;

  return { rootDir };
}

async function cleanup(rootDir: string) {
  const prisma = await getPrisma();
  await prisma.$disconnect();
  (globalThis as { prisma?: unknown }).prisma = undefined;
  await rm(rootDir, { recursive: true, force: true });
}

async function loadFamiliesRouteModule(): Promise<FamiliesRouteModule> {
  return import(`../app/api/families/route.ts?t=${Date.now()}-${Math.random()}`) as Promise<FamiliesRouteModule>;
}

function authHeader(user: { id: number; username: string }) {
  const token = signAccessToken({ userId: user.id, username: user.username });
  return { authorization: `Bearer ${token}` };
}

async function createUsers() {
  const prisma = await getPrisma();
  const suffix = Math.random().toString(36).slice(2, 10);
  const owner = await prisma.user.create({
    data: {
      firstName: "Family",
      lastName: "Owner",
      email: `create-family-owner-${suffix}@example.com`,
      username: `create-family-owner-${suffix}`,
      passwordHash: "hash",
    },
  });
  const invited = await prisma.user.create({
    data: {
      firstName: "Invited",
      lastName: "Member",
      email: `create-family-invited-${suffix}@example.com`,
      username: `create-family-invited-${suffix}`,
      passwordHash: "hash",
    },
  });

  return { owner, invited };
}

test("final create submission creates the family before persisted link and username invites", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { owner, invited } = await createUsers();
    const route = await loadFamiliesRouteModule();

    const response = await route.POST(
      new Request("http://localhost/api/families", {
        method: "POST",
        headers: {
          ...authHeader(owner),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Friday Table",
          description: "Weekly family recipes",
          pictureStorageKey: "family-images/staged/user-12/family_avatar.jpg",
          stagedInvites: [
            { id: "invite-1", kind: "link", usageType: "multi_use" },
            { id: "invite-2", kind: "username", username: invited.username.toUpperCase() },
          ],
        }),
      }),
    );

    assert.equal(response.status, 201);
    const payload = (await response.json()) as {
      completion?: {
        status: string;
        inviteResults: { inviteId: string; inviteType: string; ok: boolean }[];
      };
      family?: { id: number; name: string; pictureStorageKey: string };
    };
    assert.equal(payload.family?.name, "Friday Table");
    assert.equal(payload.family?.pictureStorageKey, "family-images/staged/user-12/family_avatar.jpg");
    assert.equal(payload.completion?.status, "success");
    assert.deepEqual(
      payload.completion?.inviteResults.map((result) => ({
        inviteId: result.inviteId,
        inviteType: result.inviteType,
        ok: result.ok,
      })),
      [
        { inviteId: "invite-1", inviteType: "link", ok: true },
        { inviteId: "invite-2", inviteType: "direct", ok: true },
      ],
    );

    const prisma = await getPrisma();
    const membership = await prisma.familyMembership.findUnique({
      where: {
        familyId_userId: {
          familyId: payload.family!.id,
          userId: owner.id,
        },
      },
    });
    assert.equal(membership?.role, "admin");

    const invites = await prisma.familyInvite.findMany({
      where: { familyId: payload.family!.id },
      orderBy: { id: "asc" },
    });
    assert.equal(invites.length, 2);
    assert.deepEqual(
      invites.map((invite) => ({
        inviteType: invite.inviteType,
        targetUserId: invite.targetUserId,
      })),
      [
        { inviteType: "link", targetUserId: null },
        { inviteType: "direct", targetUserId: invited.id },
      ],
    );
  } finally {
    await cleanup(rootDir);
  }
});

test("final create submission keeps the family when staged invite creation has recoverable failures", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { owner } = await createUsers();
    const route = await loadFamiliesRouteModule();

    const response = await route.POST(
      new Request("http://localhost/api/families", {
        method: "POST",
        headers: {
          ...authHeader(owner),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Warning Table",
          description: null,
          pictureStorageKey: null,
          stagedInvites: [{ id: "invite-1", kind: "username", username: "missing-user" }],
        }),
      }),
    );

    assert.equal(response.status, 201);
    const payload = (await response.json()) as {
      completion?: {
        failedInvites: { inviteId: string; message: string }[];
        status: string;
      };
      family?: { id: number };
    };
    assert.equal(payload.completion?.status, "warning");
    assert.deepEqual(payload.completion?.failedInvites, [
      { inviteId: "invite-1", message: "User not found" },
    ]);

    const prisma = await getPrisma();
    const family = await prisma.family.findUnique({ where: { id: payload.family!.id } });
    assert.equal(family?.name, "Warning Table");
  } finally {
    await cleanup(rootDir);
  }
});
