"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useMessages } from "@/app/_components/locale-provider";
import ManageFamiliesWorkspace, {
  type DeletionRequest,
  type Family,
  type FamilyDetail,
  type FamilyDirectInvite,
  type FamilyInviteLink,
  type Invite,
} from "@/app/account/families/_components/manage-families-workspace";
import {
  type ManageFamilySelectedStep,
  type ManageFamilyTopTab,
} from "@/lib/application/families/workflow-state";

type FamiliesResponse = {
  families?: Family[];
  error?: string;
  code?: string;
};

type InvitesResponse = {
  invites?: Invite[];
  error?: string;
  code?: string;
};

type FamilyInviteLinksResponse = {
  invites?: FamilyInviteLink[];
  error?: string;
  code?: string;
};

type FamilyDirectInvitesResponse = {
  invites?: FamilyDirectInvite[];
  error?: string;
  code?: string;
};

type CreateFamilyInviteResponse = {
  invite?: FamilyInviteLink & { inviteUrl: string };
  error?: string;
  code?: string;
};

type DeleteFamilyInviteResponse = {
  deleted?: boolean;
  inviteId?: number;
  error?: string;
  code?: string;
};

type PendingInviteActionResponse = {
  decision?: {
    status: "accepted" | "declined" | "pending";
  };
  code?: string;
  error?: string;
};

type InviteUsageType = "single_use" | "multi_use";

export default function FamiliesDashboard() {
  const locale = useLocale();
  const messages = useMessages();
  const familyMessages = messages.family;
  const familyErrors = familyMessages.errors;
  const [families, setFamilies] = useState<Family[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null);
  const [activeTopTab, setActiveTopTab] = useState<ManageFamilyTopTab>("families");
  const [activeSelectedStep, setActiveSelectedStep] = useState<ManageFamilySelectedStep>("overview");
  const [loadingFamilyId, setLoadingFamilyId] = useState<number | null>(null);
  const [familyDetailsById, setFamilyDetailsById] = useState<Record<number, FamilyDetail>>({});
  const [familyDeletionRequestById, setFamilyDeletionRequestById] = useState<Record<number, DeletionRequest | null>>({});
  const [familyCooldownById, setFamilyCooldownById] = useState<Record<number, string | null>>({});
  const [familyInviteLinksById, setFamilyInviteLinksById] = useState<Record<number, FamilyInviteLink[]>>({});
  const [familyDirectInvitesById, setFamilyDirectInvitesById] = useState<Record<number, FamilyDirectInvite[]>>({});
  const [latestInviteUrlByFamilyId, setLatestInviteUrlByFamilyId] = useState<Record<number, string | null>>({});
  const [latestInviteFocusFamilyId, setLatestInviteFocusFamilyId] = useState<number | null>(null);
  const [inviteUsageTypeByFamilyId, setInviteUsageTypeByFamilyId] = useState<Record<number, InviteUsageType>>({});
  const [familyMessageById, setFamilyMessageById] = useState<Record<number, string | null>>({});
  const [familyErrorById, setFamilyErrorById] = useState<Record<number, string | null>>({});
  const [busyActionKey, setBusyActionKey] = useState<string | null>(null);

  const formatTimestamp = useCallback(
    (value: string) => new Date(value).toLocaleString(locale),
    [locale],
  );

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

  const readError = useCallback(async (response: Response, fallback: string) => {
    try {
      const data = (await response.json()) as { code?: string; errorCode?: string };
      return getErrorForCode(data.errorCode ?? data.code, fallback);
    } catch {
      return fallback;
    }
  }, [getErrorForCode]);

  const loadFamilyContext = useCallback(async (familyId: number) => {
    setLoadingFamilyId(familyId);
    setFamilyMessageById((current) => ({ ...current, [familyId]: null }));
    setFamilyErrorById((current) => ({ ...current, [familyId]: null }));

    try {
      const detailResponse = await fetch(`/api/families/${familyId}`, { cache: "no-store" });

      if (!detailResponse.ok) {
        const detailError = await readError(detailResponse, familyErrors.loadDetails);
        setFamilyErrorById((current) => ({ ...current, [familyId]: detailError }));
        return;
      }

      const detailData = (await detailResponse.json()) as { family: FamilyDetail };
      setFamilyDetailsById((current) => ({ ...current, [familyId]: detailData.family }));

      if (detailData.family.currentUserRole === "admin") {
        const [deletionResponse, inviteLinksResponse, directInvitesResponse] = await Promise.all([
          fetch(`/api/families/${familyId}/deletion-requests/active`, { cache: "no-store" }),
          fetch(`/api/families/${familyId}/invite-links`, { cache: "no-store" }),
          fetch(`/api/families/${familyId}/direct-invites`, { cache: "no-store" }),
        ]);

        if (!deletionResponse.ok) {
          const deletionError = await readError(deletionResponse, familyErrors.loadDeletionRequest);
          setFamilyErrorById((current) => ({ ...current, [familyId]: deletionError }));
          return;
        }

        const deletionData = (await deletionResponse.json()) as {
          request: DeletionRequest | null;
          cooldownUntil: string | null;
        };
        setFamilyDeletionRequestById((current) => ({ ...current, [familyId]: deletionData.request ?? null }));
        setFamilyCooldownById((current) => ({ ...current, [familyId]: deletionData.cooldownUntil ?? null }));

        const inviteLinksData = (await inviteLinksResponse.json()) as FamilyInviteLinksResponse;
        if (!inviteLinksResponse.ok) {
          setFamilyErrorById((current) => ({
            ...current,
            [familyId]: getErrorForCode(inviteLinksData.code, familyErrors.loadInviteLinks),
          }));
          return;
        }

        setFamilyInviteLinksById((current) => ({ ...current, [familyId]: inviteLinksData.invites ?? [] }));

        const directInvitesData = (await directInvitesResponse.json()) as FamilyDirectInvitesResponse;
        if (!directInvitesResponse.ok) {
          setFamilyErrorById((current) => ({
            ...current,
            [familyId]: getErrorForCode(directInvitesData.code, familyErrors.loadInviteLinks),
          }));
          return;
        }

        setFamilyDirectInvitesById((current) => ({ ...current, [familyId]: directInvitesData.invites ?? [] }));
      } else {
        setFamilyDeletionRequestById((current) => ({ ...current, [familyId]: null }));
        setFamilyCooldownById((current) => ({ ...current, [familyId]: null }));
        setFamilyInviteLinksById((current) => ({ ...current, [familyId]: [] }));
        setFamilyDirectInvitesById((current) => ({ ...current, [familyId]: [] }));
      }
    } catch {
      setFamilyErrorById((current) => ({ ...current, [familyId]: familyErrors.loadContext }));
    } finally {
      setLoadingFamilyId((current) => (current === familyId ? null : current));
    }
  }, [
    familyErrors.loadContext,
    familyErrors.loadDeletionRequest,
    familyErrors.loadDetails,
    familyErrors.loadInviteLinks,
    getErrorForCode,
    readError,
  ]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [familiesResponse, invitesResponse] = await Promise.all([
        fetch("/api/families", { cache: "no-store" }),
        fetch("/api/me/family-invites", { cache: "no-store" }),
      ]);

      const familiesData = (await familiesResponse.json()) as FamiliesResponse;
      const invitesData = (await invitesResponse.json()) as InvitesResponse;

      if (!familiesResponse.ok) {
        setError(getErrorForCode(familiesData.code, familyErrors.loadFamilies));
        return;
      }

      if (!invitesResponse.ok) {
        setError(getErrorForCode(invitesData.code, familyErrors.loadPendingInvites));
        return;
      }

      const nextFamilies = familiesData.families ?? [];
      setFamilies(nextFamilies);
      setPendingInvites(invitesData.invites ?? []);
      setSelectedFamilyId((current) => {
        const nextSelected = current && nextFamilies.some((family) => family.id === current) ? current : null;
        if (!nextSelected) {
          setActiveTopTab("families");
        }
        return nextSelected;
      });
    } catch {
      setError(familyErrors.loadDashboard);
    } finally {
      setIsLoading(false);
    }
  }, [familyErrors.loadDashboard, familyErrors.loadFamilies, familyErrors.loadPendingInvites, getErrorForCode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!latestInviteFocusFamilyId || !latestInviteUrlByFamilyId[latestInviteFocusFamilyId]) {
      return;
    }

    const input = document.getElementById(`manage-families-invites-latest-url-input-${latestInviteFocusFamilyId}`);
    input?.focus({ preventScroll: true });
    input?.scrollIntoView({ block: "center", behavior: "smooth" });
    setLatestInviteFocusFamilyId(null);
  }, [latestInviteFocusFamilyId, latestInviteUrlByFamilyId]);

  useEffect(() => {
    if (!selectedFamilyId) {
      return;
    }

    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    const focusTarget = document.getElementById(
      isMobile ? "manage-families-selected-summary" : "manage-family-selected-heading",
    );
    focusTarget?.focus({ preventScroll: true });
    focusTarget?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selectedFamilyId]);

  async function withFamilyAction(
    familyId: number,
    actionKey: string,
    requestFactory: () => Promise<Response>,
    fallbackError: string,
  ) {
    setBusyActionKey(actionKey);
    setFamilyMessageById((current) => ({ ...current, [familyId]: null }));
    setFamilyErrorById((current) => ({ ...current, [familyId]: null }));

    try {
      const response = await requestFactory();
      if (!response.ok) {
        const actionError = await readError(response, fallbackError);
        setFamilyErrorById((current) => ({ ...current, [familyId]: actionError }));
        return false;
      }

      await Promise.all([loadData(), loadFamilyContext(familyId)]);
      return true;
    } catch {
      setFamilyErrorById((current) => ({ ...current, [familyId]: fallbackError }));
      return false;
    } finally {
      setBusyActionKey((current) => (current === actionKey ? null : current));
    }
  }

  async function handleSelectFamily(familyId: number) {
    setSelectedFamilyId(familyId);
    setActiveTopTab("selected-family");
    setActiveSelectedStep("overview");
    await loadFamilyContext(familyId);
  }

  async function handleLeaveFamily(familyId: number, requiresConfirmDelete = false) {
    const ok = await withFamilyAction(
      familyId,
      `leave-${familyId}`,
      () =>
        fetch(`/api/families/${familyId}/leave`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ confirmDelete: requiresConfirmDelete }),
        }),
      familyErrors.leaveFamily,
    );

    if (ok && selectedFamilyId === familyId) {
      setSelectedFamilyId(null);
      setActiveTopTab("families");
    }
  }

  async function handlePromoteMember(familyId: number, userId: number) {
    await withFamilyAction(
      familyId,
      `promote-${familyId}-${userId}`,
      () =>
        fetch(`/api/families/${familyId}/members/${userId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: "admin" }),
        }),
      familyErrors.promoteMember,
    );
  }

  async function handleDemoteMember(familyId: number, userId: number) {
    await withFamilyAction(
      familyId,
      `demote-${familyId}-${userId}`,
      () =>
        fetch(`/api/families/${familyId}/members/${userId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: "member" }),
        }),
      familyErrors.promoteMember,
    );
  }

  async function handleRemoveMember(familyId: number, userId: number) {
    await withFamilyAction(
      familyId,
      `remove-${familyId}-${userId}`,
      () => fetch(`/api/families/${familyId}/members/${userId}`, { method: "DELETE" }),
      familyErrors.removeMember,
    );
  }

  async function handleInitiateDeletionRequest(familyId: number) {
    const ok = await withFamilyAction(
      familyId,
      `delete-request-create-${familyId}`,
      () => fetch(`/api/families/${familyId}/deletion-requests`, { method: "POST" }),
      familyErrors.createDeletionRequest,
    );

    if (ok && selectedFamilyId === familyId && !families.some((family) => family.id === familyId)) {
      setSelectedFamilyId(null);
      setActiveTopTab("families");
    }
  }

  async function handleVoteDeletionRequest(familyId: number, requestId: number, vote: "approve" | "deny") {
    await withFamilyAction(
      familyId,
      `delete-request-vote-${vote}-${familyId}-${requestId}`,
      () => fetch(`/api/families/${familyId}/deletion-requests/${requestId}/${vote}`, { method: "POST" }),
      vote === "approve" ? familyErrors.approveDeletionRequest : familyErrors.denyDeletionRequest,
    );
  }

  async function handleCancelDeletionRequest(familyId: number, requestId: number) {
    await withFamilyAction(
      familyId,
      `delete-request-cancel-${familyId}-${requestId}`,
      () => fetch(`/api/families/${familyId}/deletion-requests/${requestId}/cancel`, { method: "POST" }),
      familyErrors.cancelDeletionRequest,
    );
  }

  async function handleCreateInviteLink(familyId: number) {
    setBusyActionKey(`invite-create-${familyId}`);
    setFamilyMessageById((current) => ({ ...current, [familyId]: null }));
    setFamilyErrorById((current) => ({ ...current, [familyId]: null }));

    const usageType = inviteUsageTypeByFamilyId[familyId] ?? "single_use";
    try {
      const response = await fetch(`/api/families/${familyId}/invite-links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ usageType }),
      });
      const data = (await response.json()) as CreateFamilyInviteResponse;

      if (!response.ok || !data.invite) {
        setFamilyErrorById((current) => ({
          ...current,
          [familyId]: getErrorForCode(data.code, familyErrors.createInviteLink),
        }));
        return;
      }

      setLatestInviteUrlByFamilyId((current) => ({ ...current, [familyId]: data.invite?.inviteUrl ?? null }));
      setActiveTopTab("selected-family");
      setActiveSelectedStep("invites");
      await loadFamilyContext(familyId);
      setLatestInviteFocusFamilyId(familyId);
      setFamilyMessageById((current) => ({
        ...current,
        [familyId]:
          usageType === "single_use" ? familyMessages.singleUseInviteCreated : familyMessages.multiUseInviteCreated,
      }));
    } catch {
      setFamilyErrorById((current) => ({ ...current, [familyId]: familyErrors.createInviteLink }));
    } finally {
      setBusyActionKey((current) => (current === `invite-create-${familyId}` ? null : current));
    }
  }

  async function handleDeleteInviteLink(familyId: number, inviteId: number) {
    setBusyActionKey(`invite-delete-${familyId}-${inviteId}`);
    setFamilyMessageById((current) => ({ ...current, [familyId]: null }));
    setFamilyErrorById((current) => ({ ...current, [familyId]: null }));

    try {
      const response = await fetch(`/api/families/${familyId}/invite-links/${inviteId}`, { method: "DELETE" });
      const data = (await response.json()) as DeleteFamilyInviteResponse;

      if (!response.ok || !data.deleted) {
        setFamilyErrorById((current) => ({
          ...current,
          [familyId]: getErrorForCode(data.code, familyErrors.deleteInviteLink),
        }));
        return;
      }

      await loadFamilyContext(familyId);
      setFamilyMessageById((current) => ({ ...current, [familyId]: familyMessages.inviteLinkDeleted }));
    } catch {
      setFamilyErrorById((current) => ({ ...current, [familyId]: familyErrors.deleteInviteLink }));
    } finally {
      setBusyActionKey((current) => (current === `invite-delete-${familyId}-${inviteId}` ? null : current));
    }
  }

  async function handleRevokeDirectInvite(familyId: number, inviteId: number) {
    setBusyActionKey(`direct-invite-revoke-${familyId}-${inviteId}`);
    setFamilyMessageById((current) => ({ ...current, [familyId]: null }));
    setFamilyErrorById((current) => ({ ...current, [familyId]: null }));

    try {
      const response = await fetch(`/api/families/${familyId}/direct-invites/${inviteId}`, { method: "DELETE" });
      const data = (await response.json()) as FamilyDirectInvitesResponse;

      if (!response.ok) {
        setFamilyErrorById((current) => ({
          ...current,
          [familyId]: getErrorForCode(data.code, familyErrors.deleteInviteLink),
        }));
        return;
      }

      await loadFamilyContext(familyId);
      setFamilyMessageById((current) => ({ ...current, [familyId]: familyMessages.directInviteRevoked }));
    } catch {
      setFamilyErrorById((current) => ({ ...current, [familyId]: familyErrors.deleteInviteLink }));
    } finally {
      setBusyActionKey((current) => (current === `direct-invite-revoke-${familyId}-${inviteId}` ? null : current));
    }
  }

  async function handlePendingInviteAction(inviteId: number, action: "accept" | "decline" | "undo-decline") {
    setBusyActionKey(`pending-invite-${action}-${inviteId}`);
    setError(null);

    try {
      const response = await fetch(`/api/me/family-invites/${inviteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as PendingInviteActionResponse;

      if (!response.ok) {
        setError(getErrorForCode(data.code, familyErrors.inviteInvalid));
        return;
      }

      await loadData();
    } catch {
      setError(familyErrors.inviteInvalid);
    } finally {
      setBusyActionKey((current) => (current === `pending-invite-${action}-${inviteId}` ? null : current));
    }
  }

  async function handleCopyInviteUrl(familyId: number) {
    const inviteUrl = latestInviteUrlByFamilyId[familyId];
    if (!inviteUrl) {
      setFamilyErrorById((current) => ({ ...current, [familyId]: familyMessages.missingInviteUrl }));
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setFamilyMessageById((current) => ({ ...current, [familyId]: familyMessages.inviteUrlCopied }));
    } catch {
      setFamilyErrorById((current) => ({ ...current, [familyId]: familyErrors.copyInviteUrl }));
    }
  }

  return (
    <section id="families-dashboard-main" className="section-stack">
      <section id="families-dashboard-header-section" data-motion-order="1" className="families-motion-section surface-panel space-y-4 p-6 sm:p-8">
        <div id="families-dashboard-header-row" className="flex items-center justify-between gap-3">
          <div id="families-dashboard-header-copy">
            <h1 id="families-dashboard-title" className="text-2xl font-semibold">{messages.common.myFamilies}</h1>
            <p id="families-dashboard-description" className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
              {familyMessages.listTitle}
            </p>
          </div>
          <div id="families-dashboard-header-actions" className="flex flex-wrap items-center justify-end gap-2">
            <Link id="families-dashboard-create-family-link" href="/account/families/new" className="text-link text-sm">
              {familyMessages.createSubmit}
            </Link>
          </div>
        </div>
      </section>

      <ManageFamiliesWorkspace
        activeSelectedStep={activeSelectedStep}
        activeTopTab={activeTopTab}
        busyActionKey={busyActionKey}
        cooldownsByFamilyId={familyCooldownById}
        deletionRequestsByFamilyId={familyDeletionRequestById}
        error={error}
        families={families}
        familyDetailsById={familyDetailsById}
        familyErrorsById={familyErrorById}
        familyDirectInvitesById={familyDirectInvitesById}
        familyInviteLinksById={familyInviteLinksById}
        familyMessages={familyMessages}
        familyMessagesById={familyMessageById}
        formatTimestamp={formatTimestamp}
        inviteUsageTypeByFamilyId={inviteUsageTypeByFamilyId}
        isLoading={isLoading}
        latestInviteUrlByFamilyId={latestInviteUrlByFamilyId}
        loadingFamilyId={loadingFamilyId}
        onCancelDeletionRequest={(familyId, requestId) => {
          void handleCancelDeletionRequest(familyId, requestId);
        }}
        onCopyInviteUrl={(familyId) => {
          void handleCopyInviteUrl(familyId);
        }}
        onCreateInviteLink={(familyId) => {
          void handleCreateInviteLink(familyId);
        }}
        onDeleteInviteLink={(familyId, inviteId) => {
          void handleDeleteInviteLink(familyId, inviteId);
        }}
        onPendingInviteAction={(inviteId, action) => {
          void handlePendingInviteAction(inviteId, action);
        }}
        onInitiateDeletionRequest={(familyId) => {
          void handleInitiateDeletionRequest(familyId);
        }}
        onLeaveFamily={(familyId, requiresConfirmDelete) => {
          void handleLeaveFamily(familyId, requiresConfirmDelete);
        }}
        onPromoteMember={(familyId, userId) => {
          void handlePromoteMember(familyId, userId);
        }}
        onDemoteMember={(familyId, userId) => {
          void handleDemoteMember(familyId, userId);
        }}
        onRemoveMember={(familyId, userId) => {
          void handleRemoveMember(familyId, userId);
        }}
        onRevokeDirectInvite={(familyId, inviteId) => {
          void handleRevokeDirectInvite(familyId, inviteId);
        }}
        onSelectFamily={(familyId) => {
          void handleSelectFamily(familyId);
        }}
        onSelectedStepSelect={setActiveSelectedStep}
        onTopTabSelect={setActiveTopTab}
        onUsageTypeChange={(familyId, usageType) => {
          setInviteUsageTypeByFamilyId((current) => ({ ...current, [familyId]: usageType }));
        }}
        onVoteDeletionRequest={(familyId, requestId, vote) => {
          void handleVoteDeletionRequest(familyId, requestId, vote);
        }}
        pendingInvites={pendingInvites}
        selectedFamilyId={selectedFamilyId}
      />
    </section>
  );
}
