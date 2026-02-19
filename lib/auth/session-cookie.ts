export const ACCESS_TOKEN_COOKIE = "recetas_access_token";

const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

export function getAccessTokenCookieConfig() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ONE_WEEK_IN_SECONDS,
  };
}
