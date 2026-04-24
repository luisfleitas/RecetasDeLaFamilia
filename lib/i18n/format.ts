import { type Locale } from "@/lib/i18n/config";

export function formatDate(value: Date | string, locale: Locale): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale).format(date);
}
