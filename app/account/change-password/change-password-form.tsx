"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

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
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Change Password</h1>
        <Link href="/" className="text-sm underline">
          Back to recipes
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="current_password" className="mb-1 block text-sm font-medium">
            Current password
          </label>
          <input id="current_password" name="current_password" type="password" required className="w-full rounded border border-zinc-300 p-2" />
        </div>

        <div>
          <label htmlFor="new_password" className="mb-1 block text-sm font-medium">
            New password
          </label>
          <input id="new_password" name="new_password" type="password" minLength={8} required className="w-full rounded border border-zinc-300 p-2" />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-green-700">{success}</p> : null}

        <button type="submit" disabled={isSubmitting} className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60">
          {isSubmitting ? "Updating..." : "Update password"}
        </button>
      </form>
    </main>
  );
}
