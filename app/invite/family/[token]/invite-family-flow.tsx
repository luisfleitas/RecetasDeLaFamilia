"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import LocaleSwitcher from "@/app/_components/locale-switcher";
import { useLocale, useMessages } from "@/app/_components/locale-provider";
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
  code?: string;
};

type FamilyMessages = ReturnType<typeof useMessages>["family"];

function getRateLimitMessage(template: string, seconds?: number) {
  return seconds ? `${template} ${seconds}s.` : template;
}

function getInviteStateLabel(messages: FamilyMessages, state: InviteDetails["state"]) {
  switch (state) {
    case "active":
      return messages.inviteStateActive;
    case "revoked":
      return messages.inviteStateRevoked;
    case "consumed":
      return messages.inviteStateConsumed;
    case "expired":
      return messages.inviteStateExpired;
    case "already_member":
      return messages.inviteStateAlreadyMember;
  }
}

function getInviteDecisionLabel(messages: FamilyMessages, status: InviteDetails["decision"]["status"]) {
  switch (status) {
    case "pending":
      return messages.inviteDecisionPending;
    case "declined":
      return messages.inviteDecisionDeclined;
    case "accepted":
      return messages.inviteDecisionAccepted;
  }
}

export default function InviteFamilyFlow({ token }: { token: string }) {
  const locale = useLocale();
  const messages = useMessages();
  const familyMessages = messages.family;
  const familyErrors = familyMessages.errors;
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getErrorForCode = useCallback((code: string | undefined, fallback: string) => {
    switch (code) {
      case "UNAUTHORIZED":
        return familyErrors.unauthorized;
      case "FORBIDDEN":
        return familyErrors.forbidden;
      case "NOT_FOUND":
        return familyErrors.notFound;
      case "VALIDATION_ERROR":
        return familyErrors.validation;
      case "RATE_LIMITED":
        return familyErrors.rateLimited;
      case "INVITE_INVALID":
        return familyErrors.inviteInvalid;
      case "INVITE_REVOKED":
        return familyErrors.inviteRevoked;
      case "INVITE_CONSUMED":
        return familyErrors.inviteConsumed;
      case "INVITE_EXPIRED":
        return familyErrors.inviteExpired;
      default:
        return fallback;
    }
  }, [familyErrors]);

  const getActionFallback = useCallback((action: "accept" | "decline" | "undo-decline") => {
    if (action === "accept") {
      return familyErrors.acceptInvite;
    }

    if (action === "decline") {
      return familyErrors.declineInvite;
    }

    return familyErrors.undoDeclineInvite;
  }, [familyErrors]);

  const loadInvite = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/family-invites/${token}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as InviteLookupResponse;

      if (!response.ok || !data.invite) {
        if (response.status === 429 || data.code === "RATE_LIMITED") {
          const retryAfterRaw = response.headers.get("retry-after");
          const retryAfterSeconds = retryAfterRaw ? Number.parseInt(retryAfterRaw, 10) : NaN;
          setError(getRateLimitMessage(
            familyErrors.rateLimited,
            Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : undefined
          ));
        } else {
          setError(getErrorForCode(data.code, familyErrors.loadInvite));
        }
        return;
      }

      setInvite(data.invite);
    } catch {
      setError(familyErrors.loadInvite);
    } finally {
      setIsLoading(false);
    }
  }, [familyErrors.loadInvite, familyErrors.rateLimited, getErrorForCode, token]);

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
        if (response.status === 409 || data.code?.startsWith("INVITE_")) {
          setError(getErrorForCode(data.code, getActionFallback(action)));
          await loadInvite();
          return;
        }

        setError(getErrorForCode(data.code, getActionFallback(action)));
        return;
      }

      if (data.code === "ALREADY_MEMBER") {
        setMessage(familyMessages.inviteAlreadyMember);
      } else if (action === "accept") {
        setMessage(familyMessages.inviteJoined);
      } else if (action === "decline") {
        setMessage(familyMessages.inviteDeclined);
      } else {
        setMessage(familyMessages.invitePending);
      }

      await loadInvite();
    } catch {
      setError(getActionFallback(action));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main id="family-invite-main" className="app-shell max-w-xl space-y-6">
      <section id="family-invite-panel" className="surface-panel space-y-4 p-6 sm:p-8">
        <div id="family-invite-header" className="flex items-center justify-between gap-3">
          <h1 id="family-invite-title" className="text-2xl font-semibold">{familyMessages.invitePageTitle}</h1>
          <div id="family-invite-header-actions" className="flex flex-wrap items-center justify-end gap-2">
            <LocaleSwitcher locale={locale} />
            <Link id="family-invite-back-link" href="/account/families" className="text-link text-sm">
              {messages.common.myFamilies}
            </Link>
          </div>
        </div>

        {isLoading ? (
          <p id="family-invite-loading" className="text-sm text-[var(--color-text-muted)]">{familyMessages.inviteLoading}</p>
        ) : error ? (
          <div id="family-invite-error-panel" className="space-y-3">
            <p id="family-invite-error" className="text-sm text-[var(--color-danger)]">{error}</p>
            <button
              id="family-invite-retry-btn"
              type="button"
              disabled={isLoading}
              onClick={() => {
                void loadInvite();
              }}
              className={buttonClassName("secondary")}
            >
              {familyMessages.inviteRetry}
            </button>
          </div>
        ) : invite ? (
          <div id="family-invite-content" className="space-y-4">
            <div id="family-invite-family-card" className="surface-card space-y-2 p-4">
              <p id="family-invite-family-name" className="text-lg font-semibold">{invite.family.name}</p>
              <p id="family-invite-family-description" className="text-sm text-[var(--color-text-muted)]">
                {invite.family.description ?? familyMessages.inviteDescriptionEmpty}
              </p>
              <p id="family-invite-state" className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
                {familyMessages.inviteStateLabel}: {getInviteStateLabel(familyMessages, invite.state)}
              </p>
              <p id="family-invite-decision-status" className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                {familyMessages.inviteDecisionStatusLabel}: {getInviteDecisionLabel(familyMessages, invite.decision.status)}
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
                {familyMessages.inviteAccept}
              </button>

              <button
                id="family-invite-decline-btn"
                type="button"
                disabled={isSubmitting || invite.state !== "active"}
                onClick={() => handleAction("decline")}
                className={buttonClassName("secondary")}
              >
                {familyMessages.inviteDecline}
              </button>

              <button
                id="family-invite-undo-decline-btn"
                type="button"
                disabled={isSubmitting || invite.decision.status !== "declined" || invite.state !== "active"}
                onClick={() => handleAction("undo-decline")}
                className={buttonClassName("secondary")}
              >
                {familyMessages.inviteUndoDecline}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
