import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { signAccessToken } from "../lib/auth/jwt";
import { getPrisma } from "../lib/prisma";

type DirectInviteRouteModule = {
  GET: (request: Request, context: { params: Promise<{ familyId: string }> }) => Promise<Response>;
  POST: (request: Request, context: { params: Promise<{ familyId: string }> }) => Promise<Response>;
};

type DirectInviteRevokeRouteModule = {
  DELETE: (request: Request, context: { params: Promise<{ familyId: string; inviteId: string }> }) => Promise<Response>;
};

type InviteTokenRouteModule = {
  GET: (request: Request, context: { params: Promise<{ token: string }> }) => Promise<Response>;
};

type InviteTokenActionRouteModule = {
  POST: (request: Request, context: { params: Promise<{ token: string }> }) => Promise<Response>;
};

type PendingInviteActionRouteModule = {
  PATCH: (request: Request, context: { params: Promise<{ inviteId: string }> }) => Promise<Response>;
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
  const rootDir = await mkdtemp(join(tmpdir(), "recetas-family-direct-invite-"));
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

async function loadDirectInviteRouteModule(): Promise<DirectInviteRouteModule> {
  return import(`../app/api/families/[familyId]/direct-invites/route.ts?t=${Date.now()}-${Math.random()}`) as Promise<DirectInviteRouteModule>;
}

async function loadDirectInviteRevokeRouteModule(): Promise<DirectInviteRevokeRouteModule> {
  return import(`../app/api/families/[familyId]/direct-invites/[inviteId]/route.ts?t=${Date.now()}-${Math.random()}`) as Promise<DirectInviteRevokeRouteModule>;
}

async function loadInviteTokenRouteModule(): Promise<InviteTokenRouteModule> {
  return import(`../app/api/family-invites/[token]/route.ts?t=${Date.now()}-${Math.random()}`) as Promise<InviteTokenRouteModule>;
}

async function loadInviteTokenActionRouteModule(action: "accept" | "decline" | "undo-decline"): Promise<InviteTokenActionRouteModule> {
  return import(`../app/api/family-invites/[token]/${action}/route.ts?t=${Date.now()}-${Math.random()}`) as Promise<InviteTokenActionRouteModule>;
}

async function loadPendingInviteActionRouteModule(): Promise<PendingInviteActionRouteModule> {
  return import(`../app/api/me/family-invites/[inviteId]/route.ts?t=${Date.now()}-${Math.random()}`) as Promise<PendingInviteActionRouteModule>;
}

function authHeader(user: { id: number; username: string }) {
  const token = signAccessToken({ userId: user.id, username: user.username });
  return { authorization: `Bearer ${token}` };
}

async function createDirectInviteScenario() {
  const prisma = await getPrisma();
  const suffix = Math.random().toString(36).slice(2, 10);
  const owner = await prisma.user.create({
    data: {
      firstName: "Family",
      lastName: "Admin",
      email: `direct-admin-${suffix}@example.com`,
      username: `direct-admin-${suffix}`,
      passwordHash: "hash",
    },
  });
  const target = await prisma.user.create({
    data: {
      firstName: "Target",
      lastName: "User",
      email: `direct-target-${suffix}@example.com`,
      username: `direct-target-${suffix}`,
      passwordHash: "hash",
    },
  });
  const other = await prisma.user.create({
    data: {
      firstName: "Wrong",
      lastName: "User",
      email: `direct-wrong-${suffix}@example.com`,
      username: `direct-wrong-${suffix}`,
      passwordHash: "hash",
    },
  });
  const family = await prisma.family.create({
    data: {
      name: "Direct Invite Family",
      description: null,
      createdByUserId: owner.id,
      memberships: {
        create: [{ userId: owner.id, role: "admin" }],
      },
    },
  });

  return { owner, target, other, family };
}

async function createDirectInvite(
  route: DirectInviteRouteModule,
  familyId: number,
  owner: { id: number; username: string },
  username: string,
) {
  return route.POST(
    new Request(`http://localhost/api/families/${familyId}/direct-invites`, {
      method: "POST",
      headers: {
        ...authHeader(owner),
        "content-type": "application/json",
      },
      body: JSON.stringify({ username }),
    }),
    { params: Promise.resolve({ familyId: String(familyId) }) },
  );
}

test("username direct invite normalizes the username, creates an immediate pending decision, and returns a targeted URL", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { owner, target, family } = await createDirectInviteScenario();
    const route = await loadDirectInviteRouteModule();

    const response = await createDirectInvite(route, family.id, owner, `  ${target.username.toUpperCase()}  `);

    assert.equal(response.status, 201);
    const payload = (await response.json()) as {
      invite?: {
        id: number;
        familyId: number;
        inviteType: string;
        targetUserId: number;
        targetUsername: string;
        usageType: string;
        state: string;
        inviteUrl: string;
      };
    };
    assert.equal(payload.invite?.familyId, family.id);
    assert.equal(payload.invite?.inviteType, "direct");
    assert.equal(payload.invite?.targetUserId, target.id);
    assert.equal(payload.invite?.targetUsername, target.username);
    assert.equal(payload.invite?.usageType, "single_use");
    assert.equal(payload.invite?.state, "active");
    assert.match(payload.invite?.inviteUrl ?? "", /^http:\/\/localhost\/invite\/family\/.+/);

    const prisma = await getPrisma();
    const decision = await prisma.familyInviteDecision.findUnique({
      where: {
        inviteId_userId: {
          inviteId: payload.invite!.id,
          userId: target.id,
        },
      },
    });
    assert.equal(decision?.status, "pending");
  } finally {
    await cleanup(rootDir);
  }
});

test("username direct invite rejects unknown users, existing members, and duplicate pending invites", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { owner, target, family } = await createDirectInviteScenario();
    const route = await loadDirectInviteRouteModule();

    const missingResponse = await createDirectInvite(route, family.id, owner, "missing-user");
    assert.equal(missingResponse.status, 404);
    assert.equal(((await missingResponse.json()) as { code?: string }).code, "USER_NOT_FOUND");

    const prisma = await getPrisma();
    await prisma.familyMembership.create({
      data: {
        familyId: family.id,
        userId: target.id,
        role: "member",
      },
    });

    const alreadyMemberResponse = await createDirectInvite(route, family.id, owner, target.username);
    assert.equal(alreadyMemberResponse.status, 409);
    assert.equal(((await alreadyMemberResponse.json()) as { code?: string }).code, "ALREADY_MEMBER");

    await prisma.familyMembership.delete({
      where: {
        familyId_userId: {
          familyId: family.id,
          userId: target.id,
        },
      },
    });

    const firstResponse = await createDirectInvite(route, family.id, owner, target.username);
    assert.equal(firstResponse.status, 201);

    const duplicateResponse = await createDirectInvite(route, family.id, owner, target.username);
    assert.equal(duplicateResponse.status, 409);
    assert.equal(((await duplicateResponse.json()) as { code?: string }).code, "DUPLICATE_PENDING_DIRECT_INVITE");
  } finally {
    await cleanup(rootDir);
  }
});

test("targeted invite URL hides family details from the wrong authenticated user and cannot be accepted by that user", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { owner, target, other, family } = await createDirectInviteScenario();
    const directRoute = await loadDirectInviteRouteModule();
    const tokenRoute = await loadInviteTokenRouteModule();
    const acceptRoute = await loadInviteTokenActionRouteModule("accept");

    const createResponse = await createDirectInvite(directRoute, family.id, owner, target.username);
    const createPayload = (await createResponse.json()) as { invite?: { inviteUrl: string } };
    const token = createPayload.invite!.inviteUrl.split("/").pop()!;

    const wrongOpenResponse = await tokenRoute.GET(
      new Request(`http://localhost/api/family-invites/${token}`, {
        headers: authHeader(other),
      }),
      { params: Promise.resolve({ token }) },
    );

    assert.equal(wrongOpenResponse.status, 403);
    const wrongOpenPayload = (await wrongOpenResponse.json()) as { code?: string; invite?: unknown };
    assert.equal(wrongOpenPayload.code, "INVITE_TARGET_MISMATCH");
    assert.equal(wrongOpenPayload.invite, undefined);

    const wrongAcceptResponse = await acceptRoute.POST(
      new Request(`http://localhost/api/family-invites/${token}/accept`, {
        method: "POST",
        headers: authHeader(other),
      }),
      { params: Promise.resolve({ token }) },
    );
    assert.equal(wrongAcceptResponse.status, 403);
    assert.equal(((await wrongAcceptResponse.json()) as { code?: string }).code, "INVITE_TARGET_MISMATCH");

    const targetOpenResponse = await tokenRoute.GET(
      new Request(`http://localhost/api/family-invites/${token}`, {
        headers: authHeader(target),
      }),
      { params: Promise.resolve({ token }) },
    );
    assert.equal(targetOpenResponse.status, 200);
    const targetOpenPayload = (await targetOpenResponse.json()) as { invite?: { inviteType: string; family?: { id: number } } };
    assert.equal(targetOpenPayload.invite?.inviteType, "direct");
    assert.equal(targetOpenPayload.invite?.family?.id, family.id);
  } finally {
    await cleanup(rootDir);
  }
});

test("direct invite revoke, expiration, accept, decline, and undo-decline follow single-use targeted semantics", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { owner, target, family } = await createDirectInviteScenario();
    const directRoute = await loadDirectInviteRouteModule();
    const revokeRoute = await loadDirectInviteRevokeRouteModule();
    const tokenRoute = await loadInviteTokenRouteModule();
    const acceptRoute = await loadInviteTokenActionRouteModule("accept");
    const declineRoute = await loadInviteTokenActionRouteModule("decline");
    const undoDeclineRoute = await loadInviteTokenActionRouteModule("undo-decline");

    const createResponse = await createDirectInvite(directRoute, family.id, owner, target.username);
    const createPayload = (await createResponse.json()) as { invite?: { id: number; inviteUrl: string } };
    const token = createPayload.invite!.inviteUrl.split("/").pop()!;

    const declineResponse = await declineRoute.POST(
      new Request(`http://localhost/api/family-invites/${token}/decline`, {
        method: "POST",
        headers: authHeader(target),
      }),
      { params: Promise.resolve({ token }) },
    );
    assert.equal(declineResponse.status, 200);
    assert.equal(((await declineResponse.json()) as { decision?: { status: string } }).decision?.status, "declined");

    const undoResponse = await undoDeclineRoute.POST(
      new Request(`http://localhost/api/family-invites/${token}/undo-decline`, {
        method: "POST",
        headers: authHeader(target),
      }),
      { params: Promise.resolve({ token }) },
    );
    assert.equal(undoResponse.status, 200);
    assert.equal(((await undoResponse.json()) as { decision?: { status: string } }).decision?.status, "pending");

    const acceptResponse = await acceptRoute.POST(
      new Request(`http://localhost/api/family-invites/${token}/accept`, {
        method: "POST",
        headers: authHeader(target),
      }),
      { params: Promise.resolve({ token }) },
    );
    assert.equal(acceptResponse.status, 200);

    const prisma = await getPrisma();
    const acceptedInvite = await prisma.familyInvite.findUniqueOrThrow({ where: { id: createPayload.invite!.id } });
    assert.equal(acceptedInvite.consumedByUserId, target.id);
    assert.ok(acceptedInvite.consumedAt instanceof Date);

    const consumedOpenResponse = await tokenRoute.GET(
      new Request(`http://localhost/api/family-invites/${token}`, {
        headers: authHeader(target),
      }),
      { params: Promise.resolve({ token }) },
    );
    assert.equal(consumedOpenResponse.status, 200);
    assert.equal(((await consumedOpenResponse.json()) as { invite?: { state: string } }).invite?.state, "already_member");

    const secondTarget = await prisma.user.create({
      data: {
        firstName: "Second",
        lastName: "Target",
        email: "second-target@example.com",
        username: "second-target",
        passwordHash: "hash",
      },
    });
    const expiringResponse = await createDirectInvite(directRoute, family.id, owner, secondTarget.username);
    const expiringPayload = (await expiringResponse.json()) as { invite?: { id: number; inviteUrl: string } };
    const expiringToken = expiringPayload.invite!.inviteUrl.split("/").pop()!;
    await prisma.familyInvite.update({
      where: { id: expiringPayload.invite!.id },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });

    const expiredAcceptResponse = await acceptRoute.POST(
      new Request(`http://localhost/api/family-invites/${expiringToken}/accept`, {
        method: "POST",
        headers: authHeader(secondTarget),
      }),
      { params: Promise.resolve({ token: expiringToken }) },
    );
    assert.equal(expiredAcceptResponse.status, 409);
    assert.equal(((await expiredAcceptResponse.json()) as { code?: string }).code, "INVITE_EXPIRED");

    const thirdTarget = await prisma.user.create({
      data: {
        firstName: "Third",
        lastName: "Target",
        email: "third-target@example.com",
        username: "third-target",
        passwordHash: "hash",
      },
    });
    const revokeCreateResponse = await createDirectInvite(directRoute, family.id, owner, thirdTarget.username);
    const revokePayload = (await revokeCreateResponse.json()) as { invite?: { id: number; inviteUrl: string } };
    const revokeToken = revokePayload.invite!.inviteUrl.split("/").pop()!;

    const revokeResponse = await revokeRoute.DELETE(
      new Request(`http://localhost/api/families/${family.id}/direct-invites/${revokePayload.invite!.id}`, {
        method: "DELETE",
        headers: authHeader(owner),
      }),
      {
        params: Promise.resolve({
          familyId: String(family.id),
          inviteId: String(revokePayload.invite!.id),
        }),
      },
    );
    assert.equal(revokeResponse.status, 200);
    assert.equal(((await revokeResponse.json()) as { invite?: { state: string } }).invite?.state, "revoked");

    const revokedAcceptResponse = await acceptRoute.POST(
      new Request(`http://localhost/api/family-invites/${revokeToken}/accept`, {
        method: "POST",
        headers: authHeader(thirdTarget),
      }),
      { params: Promise.resolve({ token: revokeToken }) },
    );
    assert.equal(revokedAcceptResponse.status, 409);
    assert.equal(((await revokedAcceptResponse.json()) as { code?: string }).code, "INVITE_REVOKED");
  } finally {
    await cleanup(rootDir);
  }
});

test("admin can list direct invites and recipient can accept decline or undo from pending invite id", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { owner, target, family } = await createDirectInviteScenario();
    const directRoute = await loadDirectInviteRouteModule();
    const pendingInviteActionRoute = await loadPendingInviteActionRouteModule();

    const createResponse = await createDirectInvite(directRoute, family.id, owner, target.username);
    const createPayload = (await createResponse.json()) as { invite?: { id: number } };
    const inviteId = createPayload.invite!.id;

    const listResponse = await directRoute.GET(
      new Request(`http://localhost/api/families/${family.id}/direct-invites`, {
        headers: authHeader(owner),
      }),
      { params: Promise.resolve({ familyId: String(family.id) }) },
    );
    assert.equal(listResponse.status, 200);
    const listPayload = (await listResponse.json()) as {
      invites?: {
        id: number;
        familyId: number;
        createdByUserId: number;
        targetUserId: number;
        targetUsername: string;
        inviteType: string;
        usageType: string;
        state: string;
      }[];
    };
    assert.equal(listPayload.invites?.length, 1);
    assert.equal(listPayload.invites?.[0]?.id, inviteId);
    assert.equal(listPayload.invites?.[0]?.familyId, family.id);
    assert.equal(listPayload.invites?.[0]?.createdByUserId, owner.id);
    assert.equal(listPayload.invites?.[0]?.targetUserId, target.id);
    assert.equal(listPayload.invites?.[0]?.targetUsername, target.username);
    assert.equal(listPayload.invites?.[0]?.inviteType, "direct");
    assert.equal(listPayload.invites?.[0]?.usageType, "single_use");
    assert.equal(listPayload.invites?.[0]?.state, "active");

    const declineResponse = await pendingInviteActionRoute.PATCH(
      new Request(`http://localhost/api/me/family-invites/${inviteId}`, {
        method: "PATCH",
        headers: {
          ...authHeader(target),
          "content-type": "application/json",
        },
        body: JSON.stringify({ action: "decline" }),
      }),
      { params: Promise.resolve({ inviteId: String(inviteId) }) },
    );
    assert.equal(declineResponse.status, 200);
    assert.equal(((await declineResponse.json()) as { decision?: { status: string } }).decision?.status, "declined");

    const undoResponse = await pendingInviteActionRoute.PATCH(
      new Request(`http://localhost/api/me/family-invites/${inviteId}`, {
        method: "PATCH",
        headers: {
          ...authHeader(target),
          "content-type": "application/json",
        },
        body: JSON.stringify({ action: "undo-decline" }),
      }),
      { params: Promise.resolve({ inviteId: String(inviteId) }) },
    );
    assert.equal(undoResponse.status, 200);
    assert.equal(((await undoResponse.json()) as { decision?: { status: string } }).decision?.status, "pending");

    const acceptResponse = await pendingInviteActionRoute.PATCH(
      new Request(`http://localhost/api/me/family-invites/${inviteId}`, {
        method: "PATCH",
        headers: {
          ...authHeader(target),
          "content-type": "application/json",
        },
        body: JSON.stringify({ action: "accept" }),
      }),
      { params: Promise.resolve({ inviteId: String(inviteId) }) },
    );
    assert.equal(acceptResponse.status, 200);

    const prisma = await getPrisma();
    const membership = await prisma.familyMembership.findUnique({
      where: {
        familyId_userId: {
          familyId: family.id,
          userId: target.id,
        },
      },
    });
    assert.equal(membership?.role, "member");
  } finally {
    await cleanup(rootDir);
  }
});

test("multi-use invite link behavior stays non-targeted and reusable", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { owner, target, other, family } = await createDirectInviteScenario();
    const linkRoute = await import(`../app/api/families/[familyId]/invite-links/route.ts?t=${Date.now()}-${Math.random()}`) as {
      POST: (request: Request, context: { params: Promise<{ familyId: string }> }) => Promise<Response>;
    };
    const acceptRoute = await loadInviteTokenActionRouteModule("accept");

    const response = await linkRoute.POST(
      new Request(`http://localhost/api/families/${family.id}/invite-links`, {
        method: "POST",
        headers: {
          ...authHeader(owner),
          "content-type": "application/json",
        },
        body: JSON.stringify({ usageType: "multi_use" }),
      }),
      { params: Promise.resolve({ familyId: String(family.id) }) },
    );
    assert.equal(response.status, 201);
    const payload = (await response.json()) as { invite?: { inviteType?: string; inviteUrl: string; usageType: string } };
    assert.equal(payload.invite?.inviteType, "link");
    assert.equal(payload.invite?.usageType, "multi_use");
    const token = payload.invite!.inviteUrl.split("/").pop()!;

    const targetAcceptResponse = await acceptRoute.POST(
      new Request(`http://localhost/api/family-invites/${token}/accept`, {
        method: "POST",
        headers: authHeader(target),
      }),
      { params: Promise.resolve({ token }) },
    );
    assert.equal(targetAcceptResponse.status, 200);

    const otherAcceptResponse = await acceptRoute.POST(
      new Request(`http://localhost/api/family-invites/${token}/accept`, {
        method: "POST",
        headers: authHeader(other),
      }),
      { params: Promise.resolve({ token }) },
    );
    assert.equal(otherAcceptResponse.status, 200);
  } finally {
    await cleanup(rootDir);
  }
});

test("invite link delete removes the link from admin lists and invalidates the token", async () => {
  const { rootDir } = await setupIntegrationEnv();

  try {
    const { owner, target, family } = await createDirectInviteScenario();
    const linkRoute = await import(`../app/api/families/[familyId]/invite-links/route.ts?t=${Date.now()}-${Math.random()}`) as {
      GET: (request: Request, context: { params: Promise<{ familyId: string }> }) => Promise<Response>;
      POST: (request: Request, context: { params: Promise<{ familyId: string }> }) => Promise<Response>;
    };
    const deleteLinkRoute = await import(`../app/api/families/[familyId]/invite-links/[inviteId]/route.ts?t=${Date.now()}-${Math.random()}`) as {
      DELETE: (request: Request, context: { params: Promise<{ familyId: string; inviteId: string }> }) => Promise<Response>;
    };
    const tokenRoute = await loadInviteTokenRouteModule();

    const createResponse = await linkRoute.POST(
      new Request(`http://localhost/api/families/${family.id}/invite-links`, {
        method: "POST",
        headers: {
          ...authHeader(owner),
          "content-type": "application/json",
        },
        body: JSON.stringify({ usageType: "single_use" }),
      }),
      { params: Promise.resolve({ familyId: String(family.id) }) },
    );
    assert.equal(createResponse.status, 201);
    const createPayload = (await createResponse.json()) as { invite?: { id: number; inviteUrl: string } };
    const inviteId = createPayload.invite!.id;
    const token = createPayload.invite!.inviteUrl.split("/").pop()!;

    const deleteResponse = await deleteLinkRoute.DELETE(
      new Request(`http://localhost/api/families/${family.id}/invite-links/${inviteId}`, {
        method: "DELETE",
        headers: authHeader(owner),
      }),
      {
        params: Promise.resolve({
          familyId: String(family.id),
          inviteId: String(inviteId),
        }),
      },
    );

    assert.equal(deleteResponse.status, 200);
    assert.deepEqual(await deleteResponse.json(), { deleted: true, inviteId });

    const listResponse = await linkRoute.GET(
      new Request(`http://localhost/api/families/${family.id}/invite-links`, {
        headers: authHeader(owner),
      }),
      { params: Promise.resolve({ familyId: String(family.id) }) },
    );
    assert.equal(listResponse.status, 200);
    const listPayload = (await listResponse.json()) as { invites?: Array<{ id: number }> };
    assert.equal(listPayload.invites?.some((invite) => invite.id === inviteId), false);

    const prisma = await getPrisma();
    const deletedInvite = await prisma.familyInvite.findUnique({ where: { id: inviteId } });
    assert.equal(deletedInvite, null);

    const openDeletedResponse = await tokenRoute.GET(
      new Request(`http://localhost/api/family-invites/${token}`, {
        headers: authHeader(target),
      }),
      { params: Promise.resolve({ token }) },
    );
    assert.equal(openDeletedResponse.status, 400);
    assert.equal(((await openDeletedResponse.json()) as { code?: string }).code, "INVITE_INVALID");
  } finally {
    await cleanup(rootDir);
  }
});
