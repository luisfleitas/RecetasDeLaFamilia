import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaUserRepository } from "../lib/infrastructure/auth/prisma-user-repository";

test("Prisma user repository exposes auth provider linking methods", () => {
  const repository = new PrismaUserRepository();

  assert.equal(typeof repository.getByAuthProviderIdentity, "function");
  assert.equal(typeof repository.attachAuthProviderIdentity, "function");
  assert.equal(typeof repository.createExternalAuthUser, "function");
  assert.equal(typeof repository.completeProfile, "function");
});
