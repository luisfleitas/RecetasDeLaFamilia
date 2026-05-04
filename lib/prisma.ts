// Prisma client singleton with environment-selected database provider.
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const vercelPostgresUrlKeys = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "recetas_DATABASE_URL",
  "recetas_POSTGRES_PRISMA_URL",
  "recetas_POSTGRES_URL",
] as const;

function getDatabaseUrl() {
  for (const key of vercelPostgresUrlKeys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }

  return "";
}

function getDatabaseProvider() {
  if (process.env.DATABASE_PROVIDER === "postgres" || process.env.DATABASE_PROVIDER === "postgresql") {
    return "postgresql";
  }

  if (/^postgres(?:ql)?:\/\//i.test(getDatabaseUrl())) {
    return "postgresql";
  }

  return "sqlite";
}

export async function getPrisma(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const log: Prisma.LogLevel[] =
    process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"];

  if (getDatabaseProvider() === "postgresql") {
    const connectionString = getDatabaseUrl();

    if (!connectionString) {
      throw new Error("DATABASE_URL is required when DATABASE_PROVIDER is postgres.");
    }

    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
      log,
    });
    return globalForPrisma.prisma;
  }

  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  globalForPrisma.prisma = new PrismaClient({ adapter, log });

  return globalForPrisma.prisma;
}
