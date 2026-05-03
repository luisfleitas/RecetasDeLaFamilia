"use client";

import Link from "next/link";
import { useState } from "react";
import LogoutButton from "@/app/_components/logout-button";

type HomeAccountMenuProps = {
  username: string;
  accountSettingsLabel: string;
  logOutLabel: string;
};

export default function HomeAccountMenu({ username, accountSettingsLabel, logOutLabel }: HomeAccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div id="home-account-menu" className="relative">
      <button
        id="home-account-menu-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="home-account-menu-list"
        onClick={() => setIsOpen((current) => !current)}
        className="rounded-full border border-[var(--brand-line-warm)] bg-[var(--brand-cream-100)] px-3 py-2 text-sm font-bold text-[var(--brand-orange-700)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--brand-cream-50)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
      >
        {username}
      </button>

      {isOpen ? (
        <div
          id="home-account-menu-list"
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-30 grid min-w-52 gap-1 rounded-xl border border-[var(--brand-line-warm)] bg-[var(--brand-cream-50)] p-2 shadow-[var(--brand-shadow-panel)]"
        >
          <Link
            id="home-account-menu-settings-link"
            role="menuitem"
            href="/account/change-password"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--brand-brown-900)] transition hover:bg-[var(--brand-cream-100)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            onClick={() => setIsOpen(false)}
          >
            {accountSettingsLabel}
          </Link>
          <div id="home-account-menu-logout" className="rounded-lg px-1 py-1">
            <LogoutButton buttonId="home-account-menu-logout-btn" role="menuitem" label={logOutLabel} className="w-full justify-center" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
