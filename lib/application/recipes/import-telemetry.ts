import { recordMetric } from "@/lib/phase3/observability";

type TelemetryPrismaClient = {
  metricEvent: {
    create: (args: {
      data: {
        metricName: string;
        requestId: string;
        actorUserId: number | null;
        familyId: number | null;
        inviteId: number | null;
        statusCode: number | null;
        metadataJson: string | null;
      };
    }) => Promise<unknown>;
  };
};

export type RecipeImportTelemetryInput = {
  prisma: TelemetryPrismaClient;
  requestId: string;
  userId: number;
  statusCode: number;
  sourceType: "paste" | "txt" | "pdf" | "image" | "unknown";
  outcome: "success" | "error" | "rate_limited";
  errorCode?: string | null;
  latencyMs: number;
  warningCount?: number;
  pdfExtractionMethod?: "text-layer" | "ocr-preview" | null;
  ocrDriver?: "local" | null;
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
      usedFallback: input.pdfExtractionMethod === "ocr-preview",
    },
  });
}
