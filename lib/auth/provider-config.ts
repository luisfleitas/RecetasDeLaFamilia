import type { AuthProviderName } from "@/lib/auth/types";

type AuthProviderEnv = {
  [key: string]: string | undefined;
  AUTH_PROVIDER?: string;
};

export function resolveAuthProviderName(env: AuthProviderEnv = process.env): AuthProviderName {
  const rawProvider = env.AUTH_PROVIDER?.trim();
  if (!rawProvider) {
    return "local";
  }

  if (rawProvider === "local" || rawProvider === "clerk") {
    return rawProvider;
  }

  throw new Error(`Unsupported AUTH_PROVIDER: ${rawProvider}`);
}
