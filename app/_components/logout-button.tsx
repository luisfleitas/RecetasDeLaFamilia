"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMessages } from "@/app/_components/locale-provider";
import { buttonClassName } from "@/app/_components/ui/button-styles";

type LogoutButtonProps = {
  className?: string;
};

export default function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const messages = useMessages();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      id="global-logout-button"
      type="button"
      onClick={handleLogout}
      disabled={isSubmitting}
      className={buttonClassName("secondary", className)}
    >
      {messages.home.logOut}
    </button>
  );
}
