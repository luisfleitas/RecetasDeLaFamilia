"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { buttonClassName } from "@/app/_components/ui/button-styles";

type InviteDetails = {
  id: number;
  familyId: number;
  state: "active" | "revoked" | "consumed" | "expired" | "already_member";
  expiresAt: string;
  family: {
    id: number;
    name: string;
    description: string | null;
    pictureUrl: string | null;
  };
  decision: {
    status: "pending" | "declined" | "accepted";
  };
};

type InviteLookupResponse = {
  invite?: InviteDetails;
  error?: string;
};

export default function InviteFamilyFlow({ token }: { token: string }) {
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadInvite = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/family-invites/${token}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as InviteLookupResponse;

      if (!response.ok || !data.invite) {
        setError(data.error ?? "Failed to load invite");
        return;
      }

      setInvite(data.invite);
    } catch {
      setError("Failed to load invite");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadInvite();
  }, [loadInvite]);

  async function handleAction(action: "accept" | "decline" | "undo-decline") {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/family-invites/${token}/${action}`, {
        method: "POST",
      });

      const data = (await response.json()) as { error?: string; code?: string };

      if (!response.ok) {
        setError(data.error ?? `Failed to ${action} invite`);
        return;
      }

      if (data.code === "ALREADY_MEMBER") {
        setMessage("You are already a member of this family.");
      } else if (action === "accept") {
        setMessage("You joined the family.");
      } else if (action === "decline") {
        setMessage("Invite declined.");
      } else {
        setMessage("Invite moved back to pending.");
      }

      await loadInvite();
    } catch {
      setError(`Failed to ${action} invite`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main id="family-invite-main" className="app-shell max-w-xl space-y-6">
      <section id="family-invite-panel" className="surface-panel space-y-4 p-6 sm:p-8">
        <div id="family-invite-header" className="flex items-center justify-between gap-3">
          <h1 id="family-invite-title" className="text-2xl font-semibold">Family Invite</h1>
          <Link id="family-invite-back-link" href="/account/families" className="text-link text-sm">
            My Families
          </Link>
        </div>

        {isLoading ? (
          <p id="family-invite-loading" className="text-sm text-[var(--color-text-muted)]">Loading invite...</p>
        ) : error ? (
          <p id="family-invite-error" className="text-sm text-[var(--color-danger)]">{error}</p>
        ) : invite ? (
          <div id="family-invite-content" className="space-y-4">
            <div id="family-invite-family-card" className="surface-card space-y-2 p-4">
              <p id="family-invite-family-name" className="text-lg font-semibold">{invite.family.name}</p>
              <p id="family-invite-family-description" className="text-sm text-[var(--color-text-muted)]">
                {invite.family.description ?? "No description"}
              </p>
              <p id="family-invite-state" className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
                State: {invite.state}
              </p>
              <p id="family-invite-decision-status" className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                Your status: {invite.decision.status}
              </p>
            </div>

            {message ? <p id="family-invite-message" className="text-sm text-[var(--color-primary)]">{message}</p> : null}

            <div id="family-invite-actions" className="flex flex-wrap gap-2">
              <button
                id="family-invite-accept-btn"
                type="button"
                disabled={isSubmitting || invite.state !== "active"}
                onClick={() => handleAction("accept")}
                className={buttonClassName("primary")}
              >
                Accept Invite
              </button>

              <button
                id="family-invite-decline-btn"
                type="button"
                disabled={isSubmitting || invite.state !== "active"}
                onClick={() => handleAction("decline")}
                className={buttonClassName("secondary")}
              >
                Decline Invite
              </button>

              <button
                id="family-invite-undo-decline-btn"
                type="button"
                disabled={isSubmitting || invite.decision.status !== "declined" || invite.state !== "active"}
                onClick={() => handleAction("undo-decline")}
                className={buttonClassName("secondary")}
              >
                Undo Decline
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
