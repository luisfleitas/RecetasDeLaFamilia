"use client";

import { createContext, useContext } from "react";
import { type Locale } from "@/lib/i18n/config";
import { type Messages } from "@/lib/i18n/messages";

type LocaleContextValue = {
  locale: Locale;
  messages: Messages;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: Locale;
  messages: Messages;
}) {
  return <LocaleContext.Provider value={{ locale, messages }}>{children}</LocaleContext.Provider>;
}

function useLocaleContext() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("Locale context is not available");
  }

  return context;
}

export function useLocale() {
  return useLocaleContext().locale;
}

export function useMessages() {
  return useLocaleContext().messages;
}
