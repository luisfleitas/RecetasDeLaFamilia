import jwt, { type SignOptions } from "jsonwebtoken";

export type AccessTokenPayload = {
  user_id: number;
  username: string;
  iat: number;
  exp: number;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error("JWT_SECRET is required");
  }
  return secret;
}

function getJwtExpiresIn(): SignOptions["expiresIn"] {
  const raw = process.env.JWT_EXPIRES_IN?.trim();
  if (!raw) {
    return "7d";
  }

  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }

  return raw as SignOptions["expiresIn"];
}

export function signAccessToken(input: { userId: number; username: string }): string {
  return jwt.sign(
    {
      user_id: input.userId,
      username: input.username,
    },
    getJwtSecret(),
    {
      expiresIn: getJwtExpiresIn(),
    },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret());

  if (typeof decoded !== "object" || decoded == null) {
    throw new Error("Invalid token payload");
  }

  const userId = decoded.user_id;
  const username = decoded.username;
  const iat = decoded.iat;
  const exp = decoded.exp;

  if (
    typeof userId !== "number" ||
    typeof username !== "string" ||
    typeof iat !== "number" ||
    typeof exp !== "number"
  ) {
    throw new Error("Invalid token payload");
  }

  return {
    user_id: userId,
    username,
    iat,
    exp,
  };
}
