"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ApiResponse = {
  error?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const payload = {
      username: String(formData.get("username") ?? "").trim(),
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
        setError(data.error ?? "Failed to login");
        return;
      }

      setMessage("Session active.");
      router.push("/");
      router.refresh();
    } catch {
      setError("Failed to login");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setError(null);
    setMessage(null);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setMessage("Session cleared.");
      router.refresh();
    } catch {
      setError("Failed to logout");
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Login</h1>
        <Link href="/" className="text-sm underline">
          Back to recipes
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="mb-1 block text-sm font-medium">
            Username
          </label>
          <input id="username" name="username" required className="w-full rounded border border-zinc-300 p-2" />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input id="password" name="password" type="password" required className="w-full rounded border border-zinc-300 p-2" />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={isSubmitting} className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
          <button type="button" onClick={handleLogout} className="rounded border border-zinc-300 px-4 py-2 text-sm">
            Logout
          </button>
        </div>
      </form>
    </main>
  );
}
