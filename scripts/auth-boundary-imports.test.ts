import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { test } from "node:test";

const allowedClerkImportPaths = new Set([
  "app/sign-in/[[...sign-in]]/page.tsx",
  "app/sign-up/[[...sign-up]]/page.tsx",
  "app/user-profile/[[...user-profile]]/page.tsx",
  "lib/auth/clerk-client-provider.tsx",
  "lib/auth/clerk-provider.ts",
  "proxy.ts",
]);

test("@clerk/nextjs imports stay inside provider-owned files", async () => {
  const offenders: string[] = [];
  const files = await listSourceFiles(["app", "lib", "proxy.ts"]);

  for (const path of files) {
    const contents = await readFile(path, "utf8");
    if (!contents.includes("@clerk/nextjs")) {
      continue;
    }

    const repoRelativePath = relative(process.cwd(), path);
    if (!allowedClerkImportPaths.has(repoRelativePath)) {
      offenders.push(repoRelativePath);
    }
  }

  assert.deepEqual(offenders, []);
});

test("Clerk provider stays lazy-loaded outside the provider-owned module", async () => {
  const offenders: string[] = [];
  const files = await listSourceFiles(["app", "lib"]);

  for (const path of files) {
    const repoRelativePath = relative(process.cwd(), path);
    if (repoRelativePath === "lib/auth/clerk-provider.ts") {
      continue;
    }

    const contents = await readFile(path, "utf8");
    if (contents.includes("from \"@/lib/auth/clerk-provider\"")) {
      offenders.push(repoRelativePath);
    }
  }

  assert.deepEqual(offenders, []);
});

async function listSourceFiles(paths: string[]): Promise<string[]> {
  const files: string[] = [];

  for (const path of paths) {
    const pathStat = await stat(path).catch(() => null);
    if (!pathStat) {
      continue;
    }

    if (pathStat.isFile()) {
      if (isSourceFile(path)) {
        files.push(path);
      }
      continue;
    }

    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".next") {
        continue;
      }
      files.push(...(await listSourceFiles([join(path, entry.name)])));
    }
  }

  return files;
}

function isSourceFile(path: string) {
  return path.endsWith(".ts") || path.endsWith(".tsx");
}
