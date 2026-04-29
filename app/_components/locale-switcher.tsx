"use client";

import { useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LOCALE_OPTIONS, type Locale } from "@/lib/i18n/config";
import { useMessages } from "@/app/_components/locale-provider";

type LocaleSwitcherProps = {
  locale: Locale;
  className?: string;
};

function localeLabel(locale: Locale, english: string, spanish: string) {
  return locale === "es" ? spanish : english;
}

export default function LocaleSwitcher({ locale, className }: LocaleSwitcherProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const messages = useMessages();
  const [isPending, startTransition] = useTransition();
  const currentSearch = searchParams?.toString() ?? "";
  const currentPath = currentSearch ? `${pathname ?? "/"}?${currentSearch}` : (pathname ?? "/");

  async function handleLocaleChange(nextLocale: Locale) {
    const response = await fetch("/api/locale", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ locale: nextLocale }),
    });

    if (!response.ok) {
      return;
    }

    if (detailsRef.current) {
      detailsRef.current.open = false;
    }

    startTransition(() => {
      router.replace(currentPath);
      router.refresh();
    });
  }

  return (
    <details
      id="global-locale-switcher"
      ref={detailsRef}
      className={["group relative", className].filter(Boolean).join(" ")}
    >
      <summary
        id="global-locale-switcher-trigger"
        aria-haspopup="menu"
        aria-controls="global-locale-switcher-menu"
        className="secondary-tab-strip-item list-none shrink-0 cursor-pointer justify-between gap-1.5 px-3 [&::-webkit-details-marker]:hidden"
      >
        <span id="global-locale-switcher-trigger-label" className="inline-flex items-center gap-2">
          <span id="global-locale-switcher-trigger-text">
            {localeLabel(locale, messages.common.english, messages.common.spanish)}
          </span>
        </span>
        <span id="global-locale-switcher-trigger-icon" aria-hidden="true">
          ▾
        </span>
      </summary>

      <div
        id="global-locale-switcher-menu"
        role="menu"
        aria-label={messages.common.localeMenuLabel}
        className="locale-switcher-menu absolute right-0 top-full z-20 mt-2 w-[17rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-card)]"
      >
        <div id="global-locale-switcher-options" className="secondary-tab-strip flex-nowrap overflow-x-auto">
          {LOCALE_OPTIONS.map((option) => {
            const isActive = option.value === locale;
            const optionLabel = option.value === "en" ? messages.common.english : messages.common.spanish;

            if (isActive) {
              return (
                <span
                  id={`global-locale-switcher-option-${option.value}`}
                  key={option.value}
                  role="menuitemradio"
                  aria-checked="true"
                  data-active="true"
                  className="secondary-tab-strip-item shrink-0"
                >
                  <span id={`global-locale-switcher-option-flag-${option.value}`} className="mr-2 text-xs font-extrabold tracking-[0.2em]">
                    {option.flag}
                  </span>
                  <span id={`global-locale-switcher-option-label-${option.value}`}>{optionLabel}</span>
                </span>
              );
            }

            return (
              <button
                id={`global-locale-switcher-option-${option.value}`}
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked="false"
                disabled={isPending}
                onClick={() => {
                  void handleLocaleChange(option.value);
                }}
                className="secondary-tab-strip-item shrink-0 disabled:cursor-wait disabled:opacity-70"
              >
                <span id={`global-locale-switcher-option-flag-${option.value}`} className="mr-2 text-xs font-extrabold tracking-[0.2em]">
                  {option.flag}
                </span>
                <span id={`global-locale-switcher-option-label-${option.value}`}>{optionLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
}
