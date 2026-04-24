"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import LocaleSwitcher from "@/app/_components/locale-switcher";
import { useLocale, useMessages } from "@/app/_components/locale-provider";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import { type AuthMessageCode } from "@/lib/application/auth/errors";

type ApiResponse = {
  errorCode?: AuthMessageCode;
};

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const messages = useMessages();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getErrorMessage(code?: AuthMessageCode) {
    if (!code) {
      return messages.auth.errors.unexpected_login_error;
    }

    return messages.auth.errors[code] ?? messages.auth.errors.unexpected_login_error;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const payload = {
      username_or_email: String(formData.get("username_or_email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(getErrorMessage(data.errorCode));
        return;
      }

      setMessage(messages.auth.sessionActive);
      const next = new URLSearchParams(window.location.search).get("next");
      const redirectTo = next && next.startsWith("/") ? next : "/";
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError(messages.auth.errors.unexpected_login_error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setError(null);
    setMessage(null);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setMessage(messages.auth.sessionCleared);
      router.refresh();
    } catch {
      setError(messages.auth.errors.unexpected_logout_error);
    }
  }

  return (
    <main id="login-page-main" className="app-shell max-w-xl space-y-6">
      <div id="login-page-panel" className="surface-panel space-y-6 p-6 sm:p-8">
        <div id="login-page-header" className="flex items-center justify-between gap-3">
          <h1 id="login-page-title" className="text-2xl font-semibold">{messages.auth.loginTitle}</h1>
          <div id="login-page-header-actions" className="flex flex-wrap items-center justify-end gap-2">
            <LocaleSwitcher locale={locale} />
            <Link id="login-page-back-link" href="/" className="text-link text-sm">
              {messages.common.backToRecipes}
            </Link>
          </div>
        </div>

        <form id="login-page-form" onSubmit={handleSubmit} className="space-y-4">
          <div id="login-page-username-field">
            <label id="login-page-username-label" htmlFor="username_or_email" className="mb-1 block text-sm font-medium">
              {messages.auth.usernameOrEmailLabel}
            </label>
            <input id="username_or_email" name="username_or_email" required className="input-base" />
          </div>

          <div id="login-page-password-field">
            <label id="login-page-password-label" htmlFor="password" className="mb-1 block text-sm font-medium">
              {messages.auth.passwordLabel}
            </label>
            <input id="password" name="password" type="password" required className="input-base" />
          </div>

          {error ? <p id="login-page-error" className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          {message ? <p id="login-page-message" className="text-sm text-[var(--color-primary)]">{message}</p> : null}

          <div id="login-page-actions" className="flex flex-wrap items-center gap-3">
            <button id="login-page-submit" type="submit" disabled={isSubmitting} className={buttonClassName("primary")}>
              {isSubmitting ? messages.auth.signingIn : messages.auth.signIn}
            </button>
            <button id="login-page-logout" type="button" onClick={handleLogout} className={buttonClassName("secondary")}>
              {messages.auth.logout}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
