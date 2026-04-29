export const SUPPORTED_LOCALES = ["en", "es"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "recetas_locale";

export const LOCALE_OPTIONS: Array<{ value: Locale; label: string; flag: string }> = [
  { value: "en", label: "English", flag: "US" },
  { value: "es", label: "Español", flag: "ES" },
];

export function isSupportedLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) {
    return DEFAULT_LOCALE;
  }

  const normalized = value.toLowerCase().trim();
  if (isSupportedLocale(normalized)) {
    return normalized;
  }

  const languageTag = normalized.split("-")[0];
  if (languageTag && isSupportedLocale(languageTag)) {
    return languageTag;
  }

  return DEFAULT_LOCALE;
}
