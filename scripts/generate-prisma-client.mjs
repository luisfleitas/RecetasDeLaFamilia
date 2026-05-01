#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getDatabaseProvider, getProviderDatabaseUrl } from "./database-provider.mjs";

const repoRoot = process.cwd();
const sqliteSchemaPath = join(repoRoot, "prisma", "schema.prisma");
const generatedSchemaPath = join(repoRoot, ".tmp", "postgres", "schema.prisma");
const providerPattern = /provider = "sqlite"/g;
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function getSchemaForProvider(provider) {
  if (provider === "sqlite") {
    return sqliteSchemaPath;
  }

  const sqliteSchema = readFileSync(sqliteSchemaPath, "utf8");
  const providerMatches = sqliteSchema.match(providerPattern) ?? [];

  if (providerMatches.length !== 1) {
    throw new Error(
      `Expected exactly one SQLite provider declaration in ${sqliteSchemaPath}; found ${providerMatches.length}.`,
    );
  }

  mkdirSync(dirname(generatedSchemaPath), { recursive: true });
  writeFileSync(generatedSchemaPath, sqliteSchema.replace(providerPattern, 'provider = "postgresql"'));

  return generatedSchemaPath;
}

const provider = getDatabaseProvider();
const schemaPath = getSchemaForProvider(provider);

// Deployed Neon builds need a Postgres-generated Prisma Client, while local dev keeps SQLite.
execFileSync(npx, ["prisma", "generate", "--schema", schemaPath], {
  cwd: repoRoot,
  env: {
    ...process.env,
    DATABASE_URL: getProviderDatabaseUrl(provider),
  },
  stdio: "inherit",
});

console.log(`Generated Prisma Client for ${provider} using ${schemaPath}`);
