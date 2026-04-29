import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, normalizeLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE);
}

export async function getRequestMessages() {
  const locale = await getRequestLocale();
  return { locale, messages: getMessages(locale) };
}
