import assert from "node:assert/strict";
import test from "node:test";
import { resolveFamilyPageAccess } from "../lib/application/families/page-access";

test("redirects unauthenticated family page access to the landing page", () => {
  assert.deepEqual(
    resolveFamilyPageAccess({
      authUserId: null,
      membership: null,
    }),
    { kind: "redirect", href: "/" },
  );
});

test("hides direct family pages from authenticated non-members", () => {
  assert.deepEqual(
    resolveFamilyPageAccess({
      authUserId: 7,
      membership: null,
    }),
    { kind: "not-found" },
  );
});

test("allows family admins to edit family pages", () => {
  assert.deepEqual(
    resolveFamilyPageAccess({
      authUserId: 7,
      membership: { familyId: 20, userId: 7, role: "admin" },
    }),
    { kind: "edit", role: "admin" },
  );
});

test("allows family members to view family pages read-only", () => {
  assert.deepEqual(
    resolveFamilyPageAccess({
      authUserId: 8,
      membership: { familyId: 20, userId: 8, role: "member" },
    }),
    { kind: "view", role: "member" },
  );
});
