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
      familyAuditEvent: {
        async create() {
          throw new Error("familyAuditEvent.create should not be called in import telemetry");
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
    ocrDriver: "openai",
  });

  if (!captured) {
    throw new Error("Expected telemetry payload to be captured");
  }

  const metric = captured as {
    metricName: string;
    requestId: string;
    actorUserId: number | null;
    familyId: number | null;
    inviteId: number | null;
    statusCode: number | null;
    metadataJson: string | null;
  };

  assert.equal(metric.metricName, "recipe_import_parse");
  assert.equal(metric.requestId, "recipe-import-request");
  assert.equal(metric.actorUserId, 42);
  assert.equal(metric.statusCode, 200);

  const metadata = JSON.parse(metric.metadataJson ?? "{}") as Record<string, unknown>;
  assert.equal(metadata.sourceType, "pdf");
  assert.equal(metadata.outcome, "success");
  assert.equal(metadata.latencyMs, 123);
  assert.equal(metadata.warningCount, 2);
  assert.equal(metadata.pdfExtractionMethod, "ocr-preview");
  assert.equal(metadata.ocrDriver, "openai");
  assert.equal(metadata.usedFallback, true);
});
