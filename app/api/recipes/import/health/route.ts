import { getRecipeImportHealthReport } from "@/lib/application/recipes/import-health";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const report = await getRecipeImportHealthReport();
    const statusCode = report.status === "degraded" ? 503 : 200;
    return NextResponse.json(report, { status: statusCode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected import health check error.";
    return NextResponse.json(
      {
        status: "degraded",
        error: message,
      },
      { status: 503 },
    );
  }
}
