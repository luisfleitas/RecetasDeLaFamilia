import { type Locale } from "@/lib/i18n/config";

function normalizeRedirectPath(pathname: string | null | undefined, search: string | null | undefined) {
  const safePathname = pathname && pathname.startsWith("/") ? pathname : "/";

  if (!search) {
    return safePathname;
  }

  const normalizedSearch = search.startsWith("?") ? search : `?${search}`;
  return normalizedSearch === "?" ? safePathname : `${safePathname}${normalizedSearch}`;
}

export function buildLocaleSwitchHref(locale: Locale, pathname: string | null | undefined, search: string | null | undefined) {
  const params = new URLSearchParams({
    locale,
    redirect: normalizeRedirectPath(pathname, search),
  });

  return `/api/locale?${params.toString()}`;
}

export function resolveLocaleRedirectTarget(requestUrl: string) {
  const url = new URL(requestUrl);
  const redirect = url.searchParams.get("redirect");

  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return "/";
  }

  return redirect;
}
