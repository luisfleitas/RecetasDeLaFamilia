#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getProviderDatabaseUrl } from "./database-provider.mjs";

const repoRoot = process.cwd();
const sqliteSchemaPath = join(repoRoot, "prisma", "schema.prisma");
const generatedSchemaPath = join(repoRoot, ".tmp", "postgres", "schema.prisma");
const generatedBaselinePath = join(repoRoot, ".tmp", "postgres", "baseline.sql");
const providerPattern = /provider = "sqlite"/g;
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function runPrisma(args) {
  execFileSync(npx, ["prisma", ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.POSTGRES_SCHEMA_CHECK_DATABASE_URL ?? getProviderDatabaseUrl("postgresql"),
    },
    stdio: "inherit",
  });
}

const sqliteSchema = readFileSync(sqliteSchemaPath, "utf8");
const providerMatches = sqliteSchema.match(providerPattern) ?? [];

if (providerMatches.length !== 1) {
  throw new Error(
    `Expected exactly one SQLite provider declaration in ${sqliteSchemaPath}; found ${providerMatches.length}.`,
  );
}

const postgresSchema = sqliteSchema.replace(providerPattern, 'provider = "postgresql"');

mkdirSync(dirname(generatedSchemaPath), { recursive: true });
writeFileSync(generatedSchemaPath, postgresSchema);

runPrisma(["validate", "--schema", generatedSchemaPath]);

execFileSync(
  npx,
  [
    "prisma",
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema",
    generatedSchemaPath,
    "--script",
    "--output",
    generatedBaselinePath,
  ],
  {
    cwd: repoRoot,
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.POSTGRES_SCHEMA_CHECK_DATABASE_URL ?? getProviderDatabaseUrl("postgresql"),
    },
    stdio: "inherit",
  },
);

const baselineSql = readFileSync(generatedBaselinePath, "utf8");

for (const expectedSnippet of [
  'CREATE TYPE "RecipeVisibility"',
  'CREATE TABLE "Recipe"',
  'CREATE TABLE "users"',
  'ALTER TABLE "Recipe" ADD CONSTRAINT',
]) {
  if (!baselineSql.includes(expectedSnippet)) {
    throw new Error(`Generated Postgres baseline is missing expected SQL: ${expectedSnippet}`);
  }
}

console.log(`Postgres schema validation passed: ${generatedSchemaPath}`);
console.log(`Generated Postgres baseline SQL: ${generatedBaselinePath}`);
