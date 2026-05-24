import assert from "node:assert/strict";
import { test } from "node:test";
import { getDeploymentHealthReport } from "../lib/application/deployment/health";
import { getDatabaseProvider, getProviderDatabaseUrl } from "./database-provider.mjs";

test("deployment health reports healthy app, database, and local storage config", async () => {
  const report = await getDeploymentHealthReport({
    env: {
      IMAGE_STORAGE_DRIVER: "local",
    },
    checkDatabase: async () => undefined,
  });

  assert.equal(report.status, "healthy");
  assert.equal(report.checks.app.status, "healthy");
  assert.equal(report.checks.database.status, "healthy");
  assert.equal(report.checks.blob.status, "not_applicable");
});

test("deployment health degrades when database ping fails", async () => {
  const report = await getDeploymentHealthReport({
    env: {
      IMAGE_STORAGE_DRIVER: "local",
    },
    checkDatabase: async () => {
      throw new Error("connection refused with secret details");
    },
  });

  assert.equal(report.status, "degraded");
  assert.equal(report.checks.database.status, "degraded");
  assert.equal(report.checks.database.message, "Database connectivity check failed.");
});

test("deployment health requires Blob token only when Blob storage is selected", async () => {
  const report = await getDeploymentHealthReport({
    env: {
      IMAGE_STORAGE_DRIVER: "vercel-blob",
    },
    checkDatabase: async () => undefined,
  });

  assert.equal(report.status, "degraded");
  assert.equal(report.checks.blob.status, "degraded");
  assert.equal(report.checks.blob.message, "Blob storage is selected but BLOB_READ_WRITE_TOKEN is not configured.");
});

test("deployment health does not expose configured Blob token value", async () => {
  const report = await getDeploymentHealthReport({
    env: {
      IMAGE_STORAGE_DRIVER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_sensitive_token",
    },
    checkDatabase: async () => undefined,
  });

  assert.equal(report.status, "healthy");
  assert.equal(report.checks.blob.status, "healthy");
  assert.doesNotMatch(JSON.stringify(report), /vercel_blob_rw_sensitive_token/);
});

test("provider URL helper ignores incompatible DATABASE_URL values", () => {
  const sqliteCiEnv = { ...process.env, DATABASE_URL: "file:./ci-quality.db" };
  const postgresEnv = {
    ...process.env,
    DATABASE_URL: "postgresql://recetas:recetas@localhost:5432/recetas",
  };

  assert.match(
    getProviderDatabaseUrl("postgresql", sqliteCiEnv),
    /^postgresql:\/\//,
  );
  assert.equal(
    getProviderDatabaseUrl("postgresql", postgresEnv),
    "postgresql://recetas:recetas@localhost:5432/recetas",
  );
  assert.equal(getProviderDatabaseUrl("sqlite", postgresEnv), "file:./dev.db");
});

test("provider helpers use the Neon integration database URL on branch previews", () => {
  const branchPreviewEnv = {
    ...process.env,
    DATABASE_URL: "",
    DATABASE_PROVIDER: "",
    VERCEL_ENV: "preview",
    recetas_DATABASE_URL: "postgresql://recetas:recetas@localhost:5432/branch_preview",
  };

  assert.equal(getDatabaseProvider(branchPreviewEnv), "postgresql");
  assert.equal(
    getProviderDatabaseUrl("postgresql", branchPreviewEnv),
    "postgresql://recetas:recetas@localhost:5432/branch_preview",
  );
});

test("provider helpers prefer branch preview Postgres URLs over committed sqlite fallback", () => {
  const branchPreviewEnv = {
    ...process.env,
    DATABASE_URL: "file:./dev.db",
    DATABASE_PROVIDER: "",
    VERCEL_ENV: "preview",
    recetas_POSTGRES_PRISMA_URL: "postgresql://recetas:recetas@localhost:5432/branch_preview",
  };

  assert.equal(getDatabaseProvider(branchPreviewEnv), "postgresql");
  assert.equal(
    getProviderDatabaseUrl("postgresql", branchPreviewEnv),
    "postgresql://recetas:recetas@localhost:5432/branch_preview",
  );
});
