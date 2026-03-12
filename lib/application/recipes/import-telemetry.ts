import { recordMetric } from "@/lib/phase3/observability";
import type { ImportSourceType } from "@/lib/application/recipes/source-documents";

export type RecipeImportTelemetryInput = {
  prisma: Parameters<typeof recordMetric>[0];
  requestId: string;
  userId: number;
  statusCode: number;
  sourceType: ImportSourceType | "unknown";
  outcome: "success" | "error" | "rate_limited";
  errorCode?: string | null;
  latencyMs: number;
  warningCount?: number;
  pdfExtractionMethod?: "text-layer" | "ocr-preview" | null;
  ocrDriver?: "local" | "openai" | null;
};

export async function recordRecipeImportTelemetry(input: RecipeImportTelemetryInput) {
  await recordMetric(input.prisma, {
    metricName: "recipe_import_parse",
    requestId: input.requestId,
    actorUserId: input.userId,
    statusCode: input.statusCode,
    metadata: {
      sourceType: input.sourceType,
      outcome: input.outcome,
      errorCode: input.errorCode ?? null,
      latencyMs: input.latencyMs,
      warningCount: input.warningCount ?? null,
      pdfExtractionMethod: input.pdfExtractionMethod ?? null,
      ocrDriver: input.ocrDriver ?? null,
      usedFallback: input.ocrDriver === "openai",
    },
  });
}
