// Prisma client singleton with environment-selected database provider.
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getDatabaseProvider() {
  if (process.env.DATABASE_PROVIDER === "postgres" || process.env.DATABASE_PROVIDER === "postgresql") {
    return "postgresql";
  }

  if (/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL ?? "")) {
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
    globalForPrisma.prisma = new PrismaClient({ log });
    return globalForPrisma.prisma;
  }

  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  globalForPrisma.prisma = new PrismaClient({ adapter, log });

  return globalForPrisma.prisma;
}
