// Prisma client singleton and SQLite adapter setup.
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export async function getPrisma(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const log: Prisma.LogLevel[] =
    process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"];
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  globalForPrisma.prisma = new PrismaClient({ adapter, log });

  return globalForPrisma.prisma;
}
