import { cleanupExpiredImportSessions } from "../lib/application/recipes/source-documents";

async function main() {
  const startedAt = new Date();
  const result = await cleanupExpiredImportSessions(startedAt);

  console.log("[import-session-cleanup] completed", {
    startedAt: startedAt.toISOString(),
    ...result,
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error("[import-session-cleanup] failed", message);
  process.exitCode = 1;
});
