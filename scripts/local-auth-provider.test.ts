import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { signAccessToken } from "../lib/auth/jwt";
import { ACCESS_TOKEN_COOKIE } from "../lib/auth/session-cookie";
import { getLocalAuthUserFromRequest } from "../lib/auth/local-provider";

beforeEach(() => {
  process.env.JWT_SECRET = "local-provider-test-secret";
});

test("local provider resolves a signed access token from the session cookie", async () => {
  const token = signAccessToken({ userId: 42, username: "alice" });
  const request = new Request("http://localhost/api/auth/me", {
    headers: {
      cookie: `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`,
    },
  });

  const authUser = await getLocalAuthUserFromRequest(request);

  assert.deepEqual(authUser, {
    userId: 42,
    username: "alice",
    profileCompletedAt: null,
  });
});

test("local provider resolves a signed access token from an authorization bearer header", async () => {
  const token = signAccessToken({ userId: 7, username: "bob" });
  const request = new Request("http://localhost/api/auth/me", {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  const authUser = await getLocalAuthUserFromRequest(request);

  assert.deepEqual(authUser, {
    userId: 7,
    username: "bob",
    profileCompletedAt: null,
  });
});

test("local provider preserves a completed profile timestamp from the signed access token", async () => {
  const profileCompletedAt = new Date("2026-05-13T12:00:00.000Z");
  const token = signAccessToken({ userId: 42, username: "alice", profileCompletedAt });
  const request = new Request("http://localhost/api/auth/me", {
    headers: {
      cookie: `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`,
    },
  });

  const authUser = await getLocalAuthUserFromRequest(request);

  assert.deepEqual(authUser, {
    userId: 42,
    username: "alice",
    profileCompletedAt,
  });
});

test("local provider rejects malformed tokens", async () => {
  const request = new Request("http://localhost/api/auth/me", {
    headers: {
      authorization: "Bearer not-a-valid-token",
    },
  });

  const authUser = await getLocalAuthUserFromRequest(request);

  assert.equal(authUser, null);
});
