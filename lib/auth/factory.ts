import { makeAuthUseCases } from "@/lib/application/auth/use-cases";
import { PrismaUserRepository } from "@/lib/infrastructure/auth/prisma-user-repository";

const DEFAULT_ADAPTER = "prisma";

export function buildAuthUseCases() {
  const adapter = process.env.DB_ADAPTER ?? DEFAULT_ADAPTER;

  switch (adapter) {
    case "prisma":
      return makeAuthUseCases(new PrismaUserRepository());
    default:
      throw new Error(`Unsupported DB adapter: ${adapter}`);
  }
}
