import { makeAuthUseCases } from "@/lib/application/auth/use-cases";
import { createClerkAuthProvider } from "@/lib/auth/clerk-provider";
import { createLocalAuthProvider } from "@/lib/auth/local-provider";
import { resolveAuthProviderName } from "@/lib/auth/provider-config";
import type { RequestAuthProvider } from "@/lib/auth/types";
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

export function buildAuthProvider(): RequestAuthProvider {
  const provider = resolveAuthProviderName();

  switch (provider) {
    case "local":
      return createLocalAuthProvider();
    case "clerk":
      return createClerkAuthProvider(new PrismaUserRepository());
    default:
      provider satisfies never;
      throw new Error(`Unsupported AUTH_PROVIDER: ${provider}`);
  }
}
