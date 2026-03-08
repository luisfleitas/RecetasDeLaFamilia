import assert from "node:assert/strict";
import { test } from "node:test";
import { recordRecipeImportTelemetry } from "../lib/application/recipes/import-telemetry";

test("recordRecipeImportTelemetry stores normalized metadata including fallback flag", async () => {
  let captured:
    | {
        metricName: string;
        requestId: string;
        actorUserId: number | null;
        familyId: number | null;
        inviteId: number | null;
        statusCode: number | null;
        metadataJson: string | null;
      }
    | null = null;

  await recordRecipeImportTelemetry({
    prisma: {
      metricEvent: {
        async create({ data }) {
          captured = data;
          return {};
        },
      },
    },
    requestId: "recipe-import-request",
    userId: 42,
    statusCode: 200,
    sourceType: "pdf",
    outcome: "success",
    latencyMs: 123,
    warningCount: 2,
    pdfExtractionMethod: "ocr-preview",
    ocrDriver: "local",
  });

  assert.ok(captured);
  assert.equal(captured?.metricName, "recipe_import_parse");
  assert.equal(captured?.requestId, "recipe-import-request");
  assert.equal(captured?.actorUserId, 42);
  assert.equal(captured?.statusCode, 200);

  const metadata = JSON.parse(captured?.metadataJson ?? "{}") as Record<string, unknown>;
  assert.equal(metadata.sourceType, "pdf");
  assert.equal(metadata.outcome, "success");
  assert.equal(metadata.latencyMs, 123);
  assert.equal(metadata.warningCount, 2);
  assert.equal(metadata.pdfExtractionMethod, "ocr-preview");
  assert.equal(metadata.ocrDriver, "local");
  assert.equal(metadata.usedFallback, true);
});
