"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import LocaleSwitcher from "@/app/_components/locale-switcher";
import { useLocale, useMessages } from "@/app/_components/locale-provider";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import { type AuthMessageCode } from "@/lib/application/auth/errors";

type ChangePasswordResponse = {
  ok?: boolean;
  errorCode?: AuthMessageCode;
};

export default function ChangePasswordForm() {
  const locale = useLocale();
  const messages = useMessages();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getErrorMessage(code?: AuthMessageCode) {
    if (!code) {
      return messages.auth.errors.unexpected_change_password_error;
    }

    return messages.auth.errors[code] ?? messages.auth.errors.unexpected_change_password_error;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);

    const payload = {
      current_password: String(formData.get("current_password") ?? ""),
      new_password: String(formData.get("new_password") ?? ""),
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as ChangePasswordResponse;

      if (!response.ok) {
        setError(getErrorMessage(data.errorCode));
        return;
      }

      setSuccess(messages.auth.passwordUpdated);
      form.reset();
    } catch {
      setError(messages.auth.errors.unexpected_change_password_error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main id="change-password-page-main" className="app-shell max-w-xl space-y-6">
      <div id="change-password-page-panel" className="surface-panel space-y-6 p-6 sm:p-8">
        <div id="change-password-page-header" className="flex items-center justify-between gap-3">
          <h1 id="change-password-page-title" className="text-2xl font-semibold">{messages.auth.manageAccountTitle}</h1>
          <div id="change-password-page-header-actions" className="flex flex-wrap items-center justify-end gap-2">
            <LocaleSwitcher locale={locale} />
            <Link id="change-password-page-back-link" href="/" className="text-link text-sm">
              {messages.common.backToRecipes}
            </Link>
          </div>
        </div>

        <form id="change-password-page-form" onSubmit={handleSubmit} className="space-y-4">
          <div id="change-password-current-password-field">
            <label id="change-password-current-password-label" htmlFor="current_password" className="mb-1 block text-sm font-medium">
              {messages.auth.currentPasswordLabel}
            </label>
            <input id="current_password" name="current_password" type="password" required className="input-base" />
          </div>

          <div id="change-password-new-password-field">
            <label id="change-password-new-password-label" htmlFor="new_password" className="mb-1 block text-sm font-medium">
              {messages.auth.newPasswordLabel}
            </label>
            <input id="new_password" name="new_password" type="password" minLength={8} required className="input-base" />
          </div>

          {error ? <p id="change-password-page-error" className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          {success ? <p id="change-password-page-success" className="text-sm text-[var(--color-primary)]">{success}</p> : null}

          <button id="change-password-page-submit" type="submit" disabled={isSubmitting} className={buttonClassName("primary")}>
            {isSubmitting ? messages.auth.updatingPassword : messages.auth.updatePassword}
          </button>
        </form>
      </div>
    </main>
  );
}
