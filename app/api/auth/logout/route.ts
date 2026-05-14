import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/session-cookie";
import { revokeCurrentClerkSession } from "@/lib/auth/clerk-provider";
import { resolveAuthProviderName } from "@/lib/auth/provider-config";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  if (resolveAuthProviderName() === "clerk") {
    await revokeCurrentClerkSession();
    return NextResponse.json({ ok: true });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
