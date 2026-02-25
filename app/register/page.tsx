"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClassName } from "@/app/_components/ui/button-styles";

type RegisterResponse = {
  user?: { id: number };
  error?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const payload = {
      first_name: String(formData.get("first_name") ?? "").trim(),
      last_name: String(formData.get("last_name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      username: String(formData.get("username") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as RegisterResponse;

      if (!response.ok) {
        setError(data.error ?? "Failed to register");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Failed to register");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main id="register-page-main" className="app-shell max-w-xl space-y-6">
      <div id="register-page-panel" className="surface-panel space-y-6 p-6 sm:p-8">
        <div id="register-page-header" className="flex items-center justify-between gap-3">
          <h1 id="register-page-title" className="text-2xl font-semibold">Create Account</h1>
          <Link id="register-page-back-link" href="/" className="text-link text-sm">
            Back to recipes
          </Link>
        </div>

        <form id="register-page-form" onSubmit={handleSubmit} className="space-y-4">
          <div id="register-page-first-name-field">
            <label id="register-page-first-name-label" htmlFor="first_name" className="mb-1 block text-sm font-medium">
              First name
            </label>
            <input id="first_name" name="first_name" required className="input-base" />
          </div>

          <div id="register-page-last-name-field">
            <label id="register-page-last-name-label" htmlFor="last_name" className="mb-1 block text-sm font-medium">
              Last name
            </label>
            <input id="last_name" name="last_name" required className="input-base" />
          </div>

          <div id="register-page-email-field">
            <label id="register-page-email-label" htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input id="email" name="email" type="email" required className="input-base" />
          </div>

          <div id="register-page-username-field">
            <label id="register-page-username-label" htmlFor="username" className="mb-1 block text-sm font-medium">
              Username
            </label>
            <input id="username" name="username" required className="input-base" />
          </div>

          <div id="register-page-password-field">
            <label id="register-page-password-label" htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input id="password" name="password" type="password" minLength={8} required className="input-base" />
          </div>

          {error ? <p id="register-page-error" className="text-sm text-[var(--color-danger)]">{error}</p> : null}

          <button id="register-page-submit" type="submit" disabled={isSubmitting} className={buttonClassName("primary")}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
