"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import LocaleSwitcher from "@/app/_components/locale-switcher";
import { useLocale, useMessages } from "@/app/_components/locale-provider";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import { type AuthMessageCode } from "@/lib/application/auth/errors";

type CompleteProfileResponse = {
  ok?: boolean;
  errorCode?: AuthMessageCode;
};

type CompleteProfileFormProps = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  nextPath: string;
};

export default function CompleteProfileForm({
  firstName,
  lastName,
  email,
  username,
  nextPath,
}: CompleteProfileFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const messages = useMessages();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getErrorMessage(code?: AuthMessageCode) {
    if (!code) {
      return messages.auth.errors.unexpected_complete_profile_error;
    }

    return messages.auth.errors[code] ?? messages.auth.errors.unexpected_complete_profile_error;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      first_name: String(formData.get("first_name") ?? "").trim(),
      last_name: String(formData.get("last_name") ?? "").trim(),
      username: String(formData.get("username") ?? "").trim(),
    };

    try {
      const response = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as CompleteProfileResponse;

      if (!response.ok) {
        setError(getErrorMessage(data.errorCode));
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setError(messages.auth.errors.unexpected_complete_profile_error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main id="complete-profile-page-main" className="app-shell max-w-xl space-y-6">
      <div id="complete-profile-page-panel" className="surface-panel space-y-6 p-6 sm:p-8">
        <div id="complete-profile-page-header" className="flex items-center justify-between gap-3">
          <div id="complete-profile-page-header-copy" className="space-y-2">
            <h1 id="complete-profile-page-title" className="text-2xl font-semibold">
              {messages.auth.completeProfileTitle}
            </h1>
            <p id="complete-profile-page-description" className="text-sm text-[var(--color-text-muted)]">
              {messages.auth.completeProfileDescription}
            </p>
          </div>
          <div id="complete-profile-page-header-actions" className="flex flex-wrap items-center justify-end gap-2">
            <LocaleSwitcher locale={locale} />
            <Link id="complete-profile-page-back-link" href="/" className="text-link text-sm">
              {messages.common.backToRecipes}
            </Link>
          </div>
        </div>

        <form id="complete-profile-page-form" onSubmit={handleSubmit} className="space-y-4">
          <div id="complete-profile-first-name-field">
            <label id="complete-profile-first-name-label" htmlFor="first_name" className="mb-1 block text-sm font-medium">
              {messages.auth.firstNameLabel}
            </label>
            <input id="first_name" name="first_name" required defaultValue={firstName} className="input-base" />
          </div>

          <div id="complete-profile-last-name-field">
            <label id="complete-profile-last-name-label" htmlFor="last_name" className="mb-1 block text-sm font-medium">
              {messages.auth.lastNameLabel}
            </label>
            <input id="last_name" name="last_name" required defaultValue={lastName} className="input-base" />
          </div>

          <div id="complete-profile-email-field">
            <label id="complete-profile-email-label" htmlFor="complete-profile-email" className="mb-1 block text-sm font-medium">
              {messages.auth.lockedEmailLabel}
            </label>
            <input id="complete-profile-email" value={email} readOnly className="input-base bg-[var(--color-surface-soft)]" />
          </div>

          <div id="complete-profile-username-field">
            <label id="complete-profile-username-label" htmlFor="username" className="mb-1 block text-sm font-medium">
              {messages.auth.usernameLabel}
            </label>
            <input id="username" name="username" required defaultValue={username} className="input-base" />
          </div>

          {error ? <p id="complete-profile-page-error" className="text-sm text-[var(--color-danger)]">{error}</p> : null}

          <button id="complete-profile-page-submit" type="submit" disabled={isSubmitting} className={buttonClassName("primary")}>
            {isSubmitting ? messages.auth.completingProfile : messages.auth.completeProfile}
          </button>
        </form>
      </div>
    </main>
  );
}
