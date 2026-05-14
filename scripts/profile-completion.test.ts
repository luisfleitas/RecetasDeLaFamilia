import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getProfileCompletionRedirect,
  isProfileComplete,
} from "../lib/auth/profile-completion";

test("profile completion detects complete and incomplete auth users", () => {
  assert.equal(
    isProfileComplete({
      userId: 1,
      username: "alice",
      profileCompletedAt: new Date("2026-05-13T12:00:00.000Z"),
    }),
    true,
  );

  assert.equal(
    isProfileComplete({
      userId: 2,
      username: "clerk-user-user-123",
      profileCompletedAt: null,
    }),
    false,
  );
});

test("profile completion redirect preserves a safe relative next path", () => {
  assert.equal(
    getProfileCompletionRedirect("/recipes/new?source=nav"),
    "/account/complete-profile?next=%2Frecipes%2Fnew%3Fsource%3Dnav",
  );
});

test("profile completion redirect rejects unsafe next paths", () => {
  assert.equal(getProfileCompletionRedirect("https://evil.test/phish"), "/account/complete-profile");
  assert.equal(getProfileCompletionRedirect("//evil.test"), "/account/complete-profile");
});
