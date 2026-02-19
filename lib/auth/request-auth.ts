import { verifyAccessToken } from "@/lib/auth/jwt";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/session-cookie";

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

function readCookieValue(cookieHeader: string, key: string): string | null {
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name === key) {
      const rawValue = valueParts.join("=");
      return rawValue ? decodeURIComponent(rawValue) : null;
    }
  }
  return null;
}

function readAccessTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  return readCookieValue(cookieHeader, ACCESS_TOKEN_COOKIE);
}

export function getAuthUserFromRequest(request: Request): AuthUser | null {
  const token = readAccessTokenFromCookie(request) ?? readBearerToken(request);
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
