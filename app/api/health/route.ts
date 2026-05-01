import { getDeploymentHealthReport } from "@/lib/application/deployment/health";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const report = await getDeploymentHealthReport();
  const statusCode = report.status === "healthy" ? 200 : 503;

  return NextResponse.json(report, { status: statusCode });
}
