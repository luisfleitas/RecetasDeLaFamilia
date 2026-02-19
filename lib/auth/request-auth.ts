import { verifyAccessToken } from "@/lib/auth/jwt";

export type AuthUser = {
  userId: number;
  username: string;
};

function readBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export function getAuthUserFromRequest(request: Request): AuthUser | null {
  const token = readBearerToken(request);
  if (!token) {
    return null;
  }

  try {
    const payload = verifyAccessToken(token);
    return {
      userId: payload.user_id,
      username: payload.username,
    };
  } catch {
    return null;
  }
}
