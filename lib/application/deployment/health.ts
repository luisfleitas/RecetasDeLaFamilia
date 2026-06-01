import { getPrisma } from "@/lib/prisma";
import { usesBlobImageStorage } from "@/lib/infrastructure/images/storage-factory";

type HealthStatus = "healthy" | "degraded";
type HealthCheckStatus = HealthStatus | "not_applicable";

export type DeploymentHealthCheck = {
  status: HealthCheckStatus;
  message?: string;
};

export type DeploymentHealthReport = {
  status: HealthStatus;
  checkedAt: string;
  checks: {
    app: DeploymentHealthCheck;
    database: DeploymentHealthCheck;
    blob: DeploymentHealthCheck;
  };
};

type HealthDependencies = {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  checkDatabase?: () => Promise<void>;
  now?: () => Date;
};

async function checkDatabaseConnectivity(): Promise<void> {
  const prisma = await getPrisma();
  await prisma.$queryRaw`SELECT 1`;
}

function checkBlobConfiguration(env: Record<string, string | undefined>): DeploymentHealthCheck {
  if (!usesBlobImageStorage(env)) {
    return {
      status: "not_applicable",
      message: "Blob storage is not selected for this environment.",
    };
  }

  if (!env.BLOB_READ_WRITE_TOKEN) {
    return {
      status: "degraded",
      message: "Blob storage is selected but BLOB_READ_WRITE_TOKEN is not configured.",
    };
  }

  return {
    status: "healthy",
    message: "Blob storage configuration is present.",
  };
}

export async function getDeploymentHealthReport(
  dependencies: HealthDependencies = {},
): Promise<DeploymentHealthReport> {
  const env = dependencies.env ?? process.env;
  const checkDatabase = dependencies.checkDatabase ?? checkDatabaseConnectivity;
  const now = dependencies.now ?? (() => new Date());

  const database: DeploymentHealthCheck = await checkDatabase()
    .then(() => ({
      status: "healthy" as const,
      message: "Database connectivity check passed.",
    }))
    .catch(() => ({
      status: "degraded" as const,
      message: "Database connectivity check failed.",
    }));

  const checks: DeploymentHealthReport["checks"] = {
    app: {
      status: "healthy",
      message: "Application runtime is responding.",
    },
    database,
    blob: checkBlobConfiguration(env),
  };

  const status = Object.values(checks).some((check) => check.status === "degraded")
    ? "degraded"
    : "healthy";

  return {
    status,
    checkedAt: now().toISOString(),
    checks,
  };
}
