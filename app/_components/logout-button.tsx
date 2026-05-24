"use client";

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

      // A document navigation forces the app shell and Clerk client state to re-read the signed-out session.
      window.location.assign("/");
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
