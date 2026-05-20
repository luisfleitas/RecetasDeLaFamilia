import { cookies } from "next/headers";
import { getLocalAuthUserFromToken } from "@/lib/auth/local-provider";
import { resolveAuthProviderName } from "@/lib/auth/provider-config";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/session-cookie";
import type { AppAuthUser } from "@/lib/auth/types";
import { PrismaUserRepository } from "@/lib/infrastructure/auth/prisma-user-repository";

export async function getOptionalAuthPageUser(): Promise<AppAuthUser | null> {
  const provider = resolveAuthProviderName();

  switch (provider) {
    case "local": {
      const cookieStore = await cookies();
      const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
      return getLocalAuthUserFromToken(token);
    }
    case "clerk": {
      const { getClerkAuthUser } = await import("@/lib/auth/clerk-provider");
      return getClerkAuthUser(new PrismaUserRepository());
    }
    default:
      provider satisfies never;
      throw new Error(`Unsupported AUTH_PROVIDER: ${provider}`);
  }
}
