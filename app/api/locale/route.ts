import { NextResponse } from "next/server";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n/config";
import { resolveLocaleRedirectTarget } from "@/lib/i18n/locale-switcher";

export const runtime = "nodejs";

function withLocaleCookie(response: NextResponse, locale: string) {
  response.cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = normalizeLocale(url.searchParams.get("locale"));
  const redirectTarget = resolveLocaleRedirectTarget(request.url);

  return withLocaleCookie(NextResponse.redirect(new URL(redirectTarget, request.url)), locale);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const locale = normalizeLocale(
    typeof body === "object" && body !== null && "locale" in body ? String(body.locale ?? "") : null,
  );

  return withLocaleCookie(NextResponse.json({ ok: true, locale }), locale);
}
