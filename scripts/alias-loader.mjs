import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function resolveCandidates(basePath) {
  return [basePath, `${basePath}.ts`, `${basePath}.tsx`, join(basePath, "index.ts")];
}

function resolveExistingPath(basePath) {
  const resolvedPath = resolveCandidates(basePath).find((candidate) => existsSync(candidate));
  return resolvedPath ?? null;
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith("@/")) {
    const basePath = join(process.cwd(), specifier.slice(2));
    const resolvedPath = resolveExistingPath(basePath);

    if (!resolvedPath) {
      return defaultResolve(specifier, context, defaultResolve);
    }

    return defaultResolve(pathToFileURL(resolvedPath).href, context, defaultResolve);
  }

  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  if (!isRelative) {
    return defaultResolve(specifier, context, defaultResolve);
  }

  const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd();
  const basePath = join(parentPath, "..", specifier);
  const resolvedPath = resolveExistingPath(basePath);
  if (!resolvedPath) {
    return defaultResolve(specifier, context, defaultResolve);
  }

  return defaultResolve(pathToFileURL(resolvedPath).href, context, defaultResolve);
}
