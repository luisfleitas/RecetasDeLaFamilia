import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isRecipeImportEnabled } from "@/lib/application/recipes/import-config";

const execFileAsync = promisify(execFile);

type DependencyName = "tesseract" | "textutil" | "qlmanage";
type DependencyStatus = "ok" | "missing" | "error";
type OverallStatus = "ok" | "degraded" | "disabled";

export type ImportDependencyCheck = {
  dependency: DependencyName;
  status: DependencyStatus;
  command: string;
  details: string;
  remediation: string;
};

export type RecipeImportHealthReport = {
  status: OverallStatus;
  featureEnabled: boolean;
  generatedAt: string;
  checks: ImportDependencyCheck[];
};

const DEPENDENCY_COMMANDS: Record<DependencyName, { command: string; args: string[]; remediation: string }> = {
  tesseract: {
    command: "tesseract",
    args: ["--version"],
    remediation: "Install Tesseract OCR and ensure it is available in PATH.",
  },
  textutil: {
    command: "textutil",
    args: ["-help"],
    remediation: "textutil is provided by macOS. Ensure this API runs on a macOS host.",
  },
  qlmanage: {
    command: "qlmanage",
    args: ["-h"],
    remediation: "qlmanage is provided by macOS. Ensure this API runs on a macOS host.",
  },
};

export function summarizeHealthStatus(
  checks: Pick<ImportDependencyCheck, "status">[],
  featureEnabled: boolean,
): OverallStatus {
  if (!featureEnabled) {
    return "disabled";
  }

  const hasFailure = checks.some((check) => check.status !== "ok");
  return hasFailure ? "degraded" : "ok";
}

async function runDependencyCheck(dependency: DependencyName): Promise<ImportDependencyCheck> {
  const config = DEPENDENCY_COMMANDS[dependency];

  try {
    const { stdout, stderr } = await execFileAsync(config.command, config.args, {
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    });

    const details = [stdout.trim(), stderr.trim()].filter((chunk) => chunk.length > 0).join(" | ");
    return {
      dependency,
      status: "ok",
      command: `${config.command} ${config.args.join(" ")}`.trim(),
      details: details || "available",
      remediation: config.remediation,
    };
  } catch (error) {
    const command = `${config.command} ${config.args.join(" ")}`.trim();
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return {
        dependency,
        status: "missing",
        command,
        details: `${config.command} not found in PATH`,
        remediation: config.remediation,
      };
    }

    const details = error instanceof Error ? error.message : "Unexpected dependency check error";
    return {
      dependency,
      status: "error",
      command,
      details,
      remediation: config.remediation,
    };
  }
}

export async function getRecipeImportHealthReport(): Promise<RecipeImportHealthReport> {
  const featureEnabled = isRecipeImportEnabled();
  const checks = await Promise.all([
    runDependencyCheck("tesseract"),
    runDependencyCheck("textutil"),
    runDependencyCheck("qlmanage"),
  ]);

  return {
    status: summarizeHealthStatus(checks, featureEnabled),
    featureEnabled,
    generatedAt: new Date().toISOString(),
    checks,
  };
}
