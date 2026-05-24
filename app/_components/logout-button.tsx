"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMessages } from "@/app/_components/locale-provider";
import { buttonClassName } from "@/app/_components/ui/button-styles";

type LogoutButtonProps = {
  buttonId?: string;
  className?: string;
  label?: string;
  role?: string;
};

export default function LogoutButton({ buttonId = "global-logout-button", className, label, role }: LogoutButtonProps) {
  const router = useRouter();
  const messages = useMessages();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) {
        throw new Error(`Logout failed with status ${response.status}`);
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setError(messages.auth.errors.unexpected_logout_error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        id={buttonId}
        type="button"
        role={role}
        onClick={handleLogout}
        disabled={isSubmitting}
        className={buttonClassName("secondary", className)}
      >
        {label ?? messages.home.logOut}
      </button>
      {error ? (
        <p id={`${buttonId}-error`} role="alert" className="mt-2 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </>
  );
}
