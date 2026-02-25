"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { buttonClassName } from "@/app/_components/ui/button-styles";

type ChangePasswordResponse = {
  ok?: boolean;
  error?: string;
};

export default function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        setError(data.error ?? "Failed to change password");
        return;
      }

      setSuccess("Password updated.");
      form.reset();
    } catch {
      setError("Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main id="change-password-page-main" className="app-shell max-w-xl space-y-6">
      <div id="change-password-page-panel" className="surface-panel space-y-6 p-6 sm:p-8">
        <div id="change-password-page-header" className="flex items-center justify-between gap-3">
          <h1 id="change-password-page-title" className="text-2xl font-semibold">Manage your Account</h1>
          <Link id="change-password-page-back-link" href="/" className="text-link text-sm">
            Back to recipes
          </Link>
        </div>

        <form id="change-password-page-form" onSubmit={handleSubmit} className="space-y-4">
          <div id="change-password-current-password-field">
            <label id="change-password-current-password-label" htmlFor="current_password" className="mb-1 block text-sm font-medium">
              Current password
            </label>
            <input id="current_password" name="current_password" type="password" required className="input-base" />
          </div>

          <div id="change-password-new-password-field">
            <label id="change-password-new-password-label" htmlFor="new_password" className="mb-1 block text-sm font-medium">
              New password
            </label>
            <input id="new_password" name="new_password" type="password" minLength={8} required className="input-base" />
          </div>

          {error ? <p id="change-password-page-error" className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          {success ? <p id="change-password-page-success" className="text-sm text-[var(--color-primary)]">{success}</p> : null}

          <button id="change-password-page-submit" type="submit" disabled={isSubmitting} className={buttonClassName("primary")}>
            {isSubmitting ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}
