"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";
import LocaleSwitcher from "@/app/_components/locale-switcher";
import { useLocale, useMessages } from "@/app/_components/locale-provider";
import { buttonClassName } from "@/app/_components/ui/button-styles";

type Family = {
  id: number;
  name: string;
  description: string | null;
  pictureUrl: string | null;
  role: "admin" | "member";
};

type FamilyMember = {
  userId: number;
  role: "admin" | "member";
  joinedAt: string;
  username: string;
  firstName: string;
  lastName: string;
};

type FamilyDetail = {
  id: number;
  name: string;
  description: string | null;
  pictureUrl: string | null;
  currentUserId: number;
  currentUserRole: "admin" | "member";
  members: FamilyMember[];
};

type DeletionVote = {
  userId: number;
  vote: "approve" | "deny";
  votedAt: string;
};

type DeletionRequest = {
  id: number;
  familyId: number;
  initiatedByUserId: number;
  status: "active" | "approved" | "denied" | "cancelled" | "expired";
  eligibleAdminCount: number;
  requiredApprovals: number;
  approveCount: number;
  denyCount: number;
  expiresAt: string;
  resolvedAt: string | null;
  resolveReason: string | null;
  votes: DeletionVote[];
};

type Invite = {
  inviteId: number;
  decisionStatus: "pending" | "declined" | "accepted";
  family: {
    id: number;
    name: string;
    description: string | null;
    pictureUrl: string | null;
  };
  invite: {
    state: "active" | "revoked" | "consumed" | "expired";
    expiresAt: string;
  };
};

type FamilyInviteLink = {
  id: number;
  familyId: number;
  createdByUserId: number;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  consumedAt: string | null;
  consumedByUserId: number | null;
  maxUses: number;
  usageType: "single_use" | "multi_use";
  state: "active" | "revoked" | "consumed" | "expired";
};

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

type CreateFamilyInviteResponse = {
  invite?: FamilyInviteLink & { inviteUrl: string };
  error?: string;
  code?: string;
};

type RevokeFamilyInviteResponse = {
  invite?: FamilyInviteLink;
  error?: string;
  code?: string;
};

type ManageFamilyTabId = "members" | "inviteCodes" | "deletion";
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
  const [isCreating, setIsCreating] = useState(false);

  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null);
  const [loadingFamilyId, setLoadingFamilyId] = useState<number | null>(null);
  const [familyDetailsById, setFamilyDetailsById] = useState<Record<number, FamilyDetail>>({});
  const [familyDeletionRequestById, setFamilyDeletionRequestById] = useState<Record<number, DeletionRequest | null>>({});
  const [familyCooldownById, setFamilyCooldownById] = useState<Record<number, string | null>>({});
  const [familyInviteLinksById, setFamilyInviteLinksById] = useState<Record<number, FamilyInviteLink[]>>({});
  const [latestInviteUrlByFamilyId, setLatestInviteUrlByFamilyId] = useState<Record<number, string | null>>({});
  const [inviteUsageTypeByFamilyId, setInviteUsageTypeByFamilyId] = useState<Record<number, InviteUsageType>>({});
  const [manageTabByFamilyId, setManageTabByFamilyId] = useState<Record<number, ManageFamilyTabId>>({});
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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [familiesResponse, invitesResponse] = await Promise.all([
        fetch("/api/families", { cache: "no-store" }),
        fetch("/api/me/family-invites?status=pending", { cache: "no-store" }),
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
      setSelectedFamilyId((current) => (
        current && !nextFamilies.some((family) => family.id === current) ? null : current
      ));
    } catch {
      setError(familyErrors.loadDashboard);
    } finally {
      setIsLoading(false);
    }
  }, [familyErrors.loadDashboard, familyErrors.loadFamilies, familyErrors.loadPendingInvites, getErrorForCode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function loadFamilyContext(familyId: number) {
    setLoadingFamilyId(familyId);
    setFamilyMessageById((current) => ({ ...current, [familyId]: null }));
    setFamilyErrorById((current) => ({ ...current, [familyId]: null }));

    try {
      const detailResponse = await fetch(`/api/families/${familyId}`, { cache: "no-store" });

      if (!detailResponse.ok) {
        const detailError = await readError(detailResponse, familyErrors.loadDetails);
        setFamilyErrorById((current) => ({
          ...current,
          [familyId]: detailError,
        }));
        return;
      }

      const detailData = (await detailResponse.json()) as { family: FamilyDetail };
      setFamilyDetailsById((current) => ({ ...current, [familyId]: detailData.family }));

      const loadInviteLinks = detailData.family.currentUserRole === "admin"
        ? fetch(`/api/families/${familyId}/invite-links`, { cache: "no-store" })
        : null;
      if (detailData.family.currentUserRole === "admin") {
        const deletionResponse = await fetch(`/api/families/${familyId}/deletion-requests/active`, { cache: "no-store" });

        if (!deletionResponse.ok) {
          const deletionError = await readError(deletionResponse, familyErrors.loadDeletionRequest);
          setFamilyErrorById((current) => ({
            ...current,
            [familyId]: deletionError,
          }));
          return;
        }

        const deletionData = (await deletionResponse.json()) as {
          request: DeletionRequest | null;
          cooldownUntil: string | null;
        };

        setFamilyDeletionRequestById((current) => ({ ...current, [familyId]: deletionData.request ?? null }));
        setFamilyCooldownById((current) => ({ ...current, [familyId]: deletionData.cooldownUntil ?? null }));
      } else {
        setFamilyDeletionRequestById((current) => ({ ...current, [familyId]: null }));
        setFamilyCooldownById((current) => ({ ...current, [familyId]: null }));
      }

      if (loadInviteLinks) {
        const inviteLinksResponse = await loadInviteLinks;
        const inviteLinksData = (await inviteLinksResponse.json()) as FamilyInviteLinksResponse;

        if (!inviteLinksResponse.ok) {
          const inviteError = getErrorForCode(inviteLinksData.code, familyErrors.loadInviteLinks);
          setFamilyErrorById((current) => ({
            ...current,
            [familyId]: inviteError,
          }));
          return;
        }

        setFamilyInviteLinksById((current) => ({
          ...current,
          [familyId]: inviteLinksData.invites ?? [],
        }));
      } else {
        setFamilyInviteLinksById((current) => ({
          ...current,
          [familyId]: [],
        }));
      }
    } catch {
      setFamilyErrorById((current) => ({
        ...current,
        [familyId]: familyErrors.loadContext,
      }));
    } finally {
      setLoadingFamilyId((current) => (current === familyId ? null : current));
    }
  }

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
        setFamilyErrorById((current) => ({
          ...current,
          [familyId]: actionError,
        }));
        return false;
      }

      await Promise.all([loadData(), loadFamilyContext(familyId)]);
      return true;
    } catch {
      setFamilyErrorById((current) => ({
        ...current,
        [familyId]: fallbackError,
      }));
      return false;
    } finally {
      setBusyActionKey((current) => (current === actionKey ? null : current));
    }
  }

  async function handleCreateFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsCreating(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      pictureStorageKey: String(formData.get("pictureStorageKey") ?? "").trim() || null,
    };

    try {
      const response = await fetch("/api/families", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { code?: string };
      if (!response.ok) {
        setError(getErrorForCode(data.code, familyErrors.createFamily));
        return;
      }

      form.reset();
      await loadData();
    } catch {
      setError(familyErrors.createFamily);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleFamilyManage(familyId: number) {
    if (selectedFamilyId === familyId) {
      setSelectedFamilyId(null);
      return;
    }

    setManageTabByFamilyId((current) => ({
      ...current,
      [familyId]: current[familyId] ?? "members",
    }));
    setSelectedFamilyId(familyId);
    await loadFamilyContext(familyId);
  }

  async function handleLeaveFamily(familyId: number) {
    const ok = await withFamilyAction(
      familyId,
      `leave-${familyId}`,
      () =>
        fetch(`/api/families/${familyId}/leave`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ confirmDelete: true }),
        }),
      familyErrors.leaveFamily,
    );

    if (ok && selectedFamilyId === familyId) {
      setSelectedFamilyId(null);
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

  async function handleRemoveMember(familyId: number, userId: number) {
    await withFamilyAction(
      familyId,
      `remove-${familyId}-${userId}`,
      () =>
        fetch(`/api/families/${familyId}/members/${userId}`, {
          method: "DELETE",
        }),
      familyErrors.removeMember,
    );
  }

  async function handleInitiateDeletionRequest(familyId: number) {
    const ok = await withFamilyAction(
      familyId,
      `delete-request-create-${familyId}`,
      () =>
        fetch(`/api/families/${familyId}/deletion-requests`, {
          method: "POST",
        }),
      familyErrors.createDeletionRequest,
    );

    if (ok && selectedFamilyId === familyId) {
      const stillExists = families.some((family) => family.id === familyId);
      if (!stillExists) {
        setSelectedFamilyId(null);
      }
    }
  }

  async function handleVoteDeletionRequest(familyId: number, requestId: number, vote: "approve" | "deny") {
    await withFamilyAction(
      familyId,
      `delete-request-vote-${vote}-${familyId}-${requestId}`,
      () =>
        fetch(`/api/families/${familyId}/deletion-requests/${requestId}/${vote}`, {
          method: "POST",
        }),
      vote === "approve" ? familyErrors.approveDeletionRequest : familyErrors.denyDeletionRequest,
    );
  }

  async function handleCancelDeletionRequest(familyId: number, requestId: number) {
    await withFamilyAction(
      familyId,
      `delete-request-cancel-${familyId}-${requestId}`,
      () =>
        fetch(`/api/families/${familyId}/deletion-requests/${requestId}/cancel`, {
          method: "POST",
        }),
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

      setLatestInviteUrlByFamilyId((current) => ({
        ...current,
        [familyId]: data.invite?.inviteUrl ?? null,
      }));
      await loadFamilyContext(familyId);
      setFamilyMessageById((current) => ({
        ...current,
        [familyId]:
          usageType === "single_use" ? familyMessages.singleUseInviteCreated : familyMessages.multiUseInviteCreated,
      }));
    } catch {
      setFamilyErrorById((current) => ({
        ...current,
        [familyId]: familyErrors.createInviteLink,
      }));
    } finally {
      setBusyActionKey((current) => (current === `invite-create-${familyId}` ? null : current));
    }
  }

  async function handleRevokeInviteLink(familyId: number, inviteId: number) {
    setBusyActionKey(`invite-revoke-${familyId}-${inviteId}`);
    setFamilyMessageById((current) => ({ ...current, [familyId]: null }));
    setFamilyErrorById((current) => ({ ...current, [familyId]: null }));

    try {
      const response = await fetch(`/api/families/${familyId}/invite-links/${inviteId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as RevokeFamilyInviteResponse;

      if (!response.ok || !data.invite) {
        setFamilyErrorById((current) => ({
          ...current,
          [familyId]: getErrorForCode(data.code, familyErrors.revokeInviteLink),
        }));
        return;
      }

      await loadFamilyContext(familyId);
      setFamilyMessageById((current) => ({
        ...current,
        [familyId]: familyMessages.inviteLinkRevoked,
      }));
    } catch {
      setFamilyErrorById((current) => ({
        ...current,
        [familyId]: familyErrors.revokeInviteLink,
      }));
    } finally {
      setBusyActionKey((current) => (current === `invite-revoke-${familyId}-${inviteId}` ? null : current));
    }
  }

  async function handleCopyInviteUrl(familyId: number) {
    const inviteUrl = latestInviteUrlByFamilyId[familyId];
    if (!inviteUrl) {
      setFamilyErrorById((current) => ({
        ...current,
        [familyId]: familyMessages.missingInviteUrl,
      }));
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setFamilyMessageById((current) => ({
        ...current,
        [familyId]: familyMessages.inviteUrlCopied,
      }));
    } catch {
      setFamilyErrorById((current) => ({
        ...current,
        [familyId]: familyErrors.copyInviteUrl,
      }));
    }
  }

  return (
    <main id="families-dashboard-main" className="app-shell max-w-4xl space-y-6">
      <section id="families-dashboard-header-section" data-motion-order="1" className="families-motion-section surface-panel space-y-4 p-6 sm:p-8">
        <div id="families-dashboard-header-row" className="flex items-center justify-between gap-3">
          <h1 id="families-dashboard-title" className="text-2xl font-semibold">{messages.common.myFamilies}</h1>
          <div id="families-dashboard-header-actions" className="flex flex-wrap items-center justify-end gap-2">
            <LocaleSwitcher locale={locale} />
            <Link id="families-dashboard-back-link" href="/" className="text-link text-sm">
              {messages.common.backToRecipes}
            </Link>
          </div>
        </div>

        <form id="families-dashboard-create-form" onSubmit={handleCreateFamily} className="space-y-3">
          <div id="families-dashboard-create-name-field">
            <label id="families-dashboard-create-name-label" htmlFor="family_name" className="mb-1 block text-sm font-medium">
              {familyMessages.createNameLabel}
            </label>
            <input id="family_name" name="name" required className="input-base" />
          </div>

          <div id="families-dashboard-create-description-field">
            <label id="families-dashboard-create-description-label" htmlFor="family_description" className="mb-1 block text-sm font-medium">
              {familyMessages.createDescriptionLabel}
            </label>
            <textarea id="family_description" name="description" rows={2} className="input-base" />
          </div>

          <div id="families-dashboard-create-picture-field">
            <label id="families-dashboard-create-picture-label" htmlFor="family_picture_storage_key" className="mb-1 block text-sm font-medium">
              {familyMessages.createPictureLabel}
            </label>
            <input id="family_picture_storage_key" name="pictureStorageKey" className="input-base" />
          </div>

          {error ? <p id="families-dashboard-error-message" className="text-sm text-[var(--color-danger)]">{error}</p> : null}

          <button id="families-dashboard-create-submit-btn" type="submit" disabled={isCreating} className={buttonClassName("primary")}>
            {isCreating ? familyMessages.creatingSubmit : familyMessages.createSubmit}
          </button>
        </form>
      </section>

      <section id="families-dashboard-list-section" data-motion-order="2" className="families-motion-section surface-panel space-y-4 p-6 sm:p-8">
        <h2 id="families-dashboard-list-title" className="text-xl font-semibold">{familyMessages.listTitle}</h2>
        {isLoading ? (
          <p id="families-dashboard-list-loading" className="text-sm text-[var(--color-text-muted)]">{familyMessages.listLoading}</p>
        ) : families.length === 0 ? (
          <p id="families-dashboard-list-empty" className="text-sm text-[var(--color-text-muted)]">{familyMessages.listEmpty}</p>
        ) : (
          <ul id="families-dashboard-list" className="space-y-3">
            {families.map((family, index) => {
              const isSelected = selectedFamilyId === family.id;
              const detail = familyDetailsById[family.id];
              const deletionRequest = familyDeletionRequestById[family.id] ?? null;
              const cooldownUntil = familyCooldownById[family.id] ?? null;
              const familyError = familyErrorById[family.id];
              const familyMessage = familyMessageById[family.id];
              const inviteLinks = familyInviteLinksById[family.id] ?? [];
              const latestInviteUrl = latestInviteUrlByFamilyId[family.id];
              const inviteUsageType = inviteUsageTypeByFamilyId[family.id] ?? "single_use";
              const currentUserVote =
                detail && deletionRequest
                  ? deletionRequest.votes.find((vote) => vote.userId === detail.currentUserId) ?? null
                  : null;
              const isAdmin = detail?.currentUserRole === "admin";
              const manageTabs: Array<{ id: ManageFamilyTabId; label: string }> = [
                { id: "members", label: familyMessages.membersTab },
                { id: "inviteCodes", label: familyMessages.inviteCodesTab },
                { id: "deletion", label: familyMessages.deletionTab },
              ];
              const activeManageTab = manageTabByFamilyId[family.id] ?? "members";

              const canInitiateDeletion =
                isAdmin &&
                !deletionRequest &&
                (!cooldownUntil || new Date(cooldownUntil) <= new Date());

              return (
                <li
                  id={`families-dashboard-list-item-${family.id}`}
                  key={family.id}
                  className="families-motion-card surface-card space-y-4 p-4"
                  style={{ animationDelay: `${140 + index * 55}ms` }}
                >
                  <div id={`families-dashboard-list-item-summary-${family.id}`} className="flex items-start justify-between gap-4">
                    <div id={`families-dashboard-list-item-content-${family.id}`} className="space-y-1">
                      <p id={`families-dashboard-list-item-name-${family.id}`} className="text-lg font-semibold">{family.name}</p>
                      {family.description ? (
                        <p id={`families-dashboard-list-item-description-${family.id}`} className="text-sm text-[var(--color-text-muted)]">{family.description}</p>
                      ) : (
                        <p id={`families-dashboard-list-item-description-empty-${family.id}`} className="text-sm text-[var(--color-text-muted)]">{familyMessages.descriptionEmpty}</p>
                      )}
                      <p id={`families-dashboard-list-item-role-${family.id}`} className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
                        {family.role}
                      </p>
                    </div>

                    {family.pictureUrl ? (
                      <Image
                        id={`families-dashboard-list-item-picture-${family.id}`}
                        src={family.pictureUrl}
                        alt={family.name}
                        className="h-16 w-16 rounded-[var(--radius-sm)] object-cover"
                        width={64}
                        height={64}
                      />
                    ) : (
                      <div id={`families-dashboard-list-item-picture-placeholder-${family.id}`} className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] text-xs text-[var(--color-text-muted)]">
                        {familyMessages.pictureEmpty}
                      </div>
                    )}
                  </div>

                  <div id={`families-dashboard-list-item-actions-${family.id}`} className="flex flex-wrap gap-2">
                    <button
                      id={`families-dashboard-list-item-manage-btn-${family.id}`}
                      type="button"
                      className={buttonClassName("secondary")}
                      onClick={() => {
                        void handleToggleFamilyManage(family.id);
                      }}
                    >
                      {isSelected
                        ? familyMessages.hideDetails
                        : family.role === "admin"
                          ? familyMessages.manageFamily
                          : familyMessages.viewMembers}
                    </button>
                    <button
                      id={`families-dashboard-list-item-leave-btn-${family.id}`}
                      type="button"
                      className={buttonClassName("secondary")}
                      disabled={busyActionKey === `leave-${family.id}`}
                      onClick={() => {
                        void handleLeaveFamily(family.id);
                      }}
                    >
                      {busyActionKey === `leave-${family.id}` ? familyMessages.leavingFamily : familyMessages.leaveFamily}
                    </button>
                  </div>

                  {isSelected ? (
                    <section id={`families-dashboard-list-item-manage-section-${family.id}`} className="families-manage-panel space-y-4 border-t border-[var(--color-border)] pt-4">
                      {loadingFamilyId === family.id ? (
                        <p id={`families-dashboard-list-item-manage-loading-${family.id}`} className="text-sm text-[var(--color-text-muted)]">{familyMessages.familyDetailsLoading}</p>
                      ) : detail ? (
                        <>
                          {isAdmin ? (
                            <div
                              id={`families-dashboard-list-item-manage-secondary-menu-${family.id}`}
                              role="tablist"
                              aria-label={`Manage ${family.name} sections`}
                              className="sticky top-2 z-10 -mx-1 flex gap-3 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-surface)] px-1 pb-0.5 pt-0.5"
                            >
                              {manageTabs.map((tab) => {
                                const isActive = activeManageTab === tab.id;

                                return (
                                  <button
                                    id={`families-dashboard-list-item-manage-secondary-menu-tab-${family.id}-${tab.id}`}
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    aria-controls={
                                      tab.id === "members"
                                        ? `families-dashboard-list-item-members-section-${family.id}`
                                        : tab.id === "inviteCodes"
                                          ? `families-dashboard-list-item-invites-section-${family.id}`
                                          : `families-dashboard-list-item-deletion-section-${family.id}`
                                    }
                                    tabIndex={isActive ? 0 : -1}
                                    className={`relative shrink-0 rounded-t-md border-b-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-wide transition-all duration-150 ${
                                      isActive
                                        ? "border-[var(--color-primary)] bg-[var(--color-surface-soft)] text-[var(--color-text)]"
                                        : "border-transparent text-[var(--color-text-muted)] hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text)]"
                                    }`}
                                    onClick={() => {
                                      setManageTabByFamilyId((current) => ({ ...current, [family.id]: tab.id }));
                                    }}
                                  >
                                    {tab.label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}

                          {(!isAdmin || activeManageTab === "members") ? (
                            <div
                              id={`families-dashboard-list-item-members-section-${family.id}`}
                              role={isAdmin ? "tabpanel" : undefined}
                              aria-labelledby={isAdmin ? `families-dashboard-list-item-manage-secondary-menu-tab-${family.id}-members` : undefined}
                              className="space-y-2"
                            >
                              <h3 id={`families-dashboard-list-item-members-title-${family.id}`} className="text-base font-semibold">{familyMessages.membersTitle}</h3>
                              <ul id={`families-dashboard-list-item-members-list-${family.id}`} className="space-y-2">
                                {detail.members.map((member) => {
                                  const canPromote = detail.currentUserRole === "admin" && member.role !== "admin";
                                  const canRemove = detail.currentUserRole === "admin" && member.userId !== detail.currentUserId;

                                  return (
                                    <li id={`families-dashboard-list-item-member-item-${family.id}-${member.userId}`} key={member.userId} className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
                                      <div id={`families-dashboard-list-item-member-content-${family.id}-${member.userId}`}>
                                        <p id={`families-dashboard-list-item-member-name-${family.id}-${member.userId}`} className="text-sm font-medium">
                                          {member.firstName} {member.lastName} ({member.username})
                                        </p>
                                        <p id={`families-dashboard-list-item-member-role-${family.id}-${member.userId}`} className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                                          {member.role}
                                        </p>
                                      </div>
                                      <div id={`families-dashboard-list-item-member-actions-${family.id}-${member.userId}`} className="flex gap-2">
                                        {canPromote ? (
                                          <button
                                            id={`families-dashboard-list-item-member-promote-btn-${family.id}-${member.userId}`}
                                            type="button"
                                            className={buttonClassName("secondary")}
                                            disabled={busyActionKey === `promote-${family.id}-${member.userId}`}
                                            onClick={() => {
                                              void handlePromoteMember(family.id, member.userId);
                                            }}
                                          >
                                            {busyActionKey === `promote-${family.id}-${member.userId}`
                                              ? familyMessages.promotingMember
                                              : familyMessages.promoteToAdmin}
                                          </button>
                                        ) : null}
                                        {canRemove ? (
                                          <button
                                            id={`families-dashboard-list-item-member-remove-btn-${family.id}-${member.userId}`}
                                            type="button"
                                            className={buttonClassName("secondary")}
                                            disabled={busyActionKey === `remove-${family.id}-${member.userId}`}
                                            onClick={() => {
                                              void handleRemoveMember(family.id, member.userId);
                                            }}
                                          >
                                            {busyActionKey === `remove-${family.id}-${member.userId}`
                                              ? familyMessages.removingMember
                                              : familyMessages.removeMember}
                                          </button>
                                        ) : null}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ) : null}

                          {isAdmin && activeManageTab === "inviteCodes" ? (
                            <div
                              id={`families-dashboard-list-item-invites-section-${family.id}`}
                              role="tabpanel"
                              aria-labelledby={`families-dashboard-list-item-manage-secondary-menu-tab-${family.id}-inviteCodes`}
                              className="space-y-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3"
                            >
                              <div id={`families-dashboard-list-item-invites-header-${family.id}`} className="flex flex-wrap items-center justify-between gap-2">
                                <h3 id={`families-dashboard-list-item-invites-title-${family.id}`} className="text-base font-semibold">{familyMessages.inviteCodesTitle}</h3>
                                <button
                                  id={`families-dashboard-list-item-invites-create-btn-${family.id}`}
                                  type="button"
                                  className={buttonClassName("primary")}
                                  disabled={busyActionKey === `invite-create-${family.id}`}
                                  onClick={() => {
                                    void handleCreateInviteLink(family.id);
                                  }}
                                >
                                  {busyActionKey === `invite-create-${family.id}`
                                    ? familyMessages.generatingInviteLink
                                    : familyMessages.generateInviteLink}
                                </button>
                              </div>

                              <fieldset id={`families-dashboard-list-item-invites-usage-fieldset-${family.id}`} className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
                                <legend id={`families-dashboard-list-item-invites-usage-legend-${family.id}`} className="px-1 text-sm font-medium">
                                  {familyMessages.inviteUsageLegend}
                                </legend>
                                <div id={`families-dashboard-list-item-invites-usage-options-${family.id}`} className="flex flex-wrap gap-3">
                                  <label id={`families-dashboard-list-item-invites-usage-single-label-${family.id}`} htmlFor={`families-dashboard-list-item-invites-usage-single-input-${family.id}`} className="flex items-center gap-2 text-sm">
                                    <input
                                      id={`families-dashboard-list-item-invites-usage-single-input-${family.id}`}
                                      type="radio"
                                      name={`invite-usage-type-${family.id}`}
                                      value="single_use"
                                      checked={inviteUsageType === "single_use"}
                                      onChange={() => {
                                        setInviteUsageTypeByFamilyId((current) => ({ ...current, [family.id]: "single_use" }));
                                      }}
                                    />
                                    {familyMessages.inviteSingleUse}
                                  </label>
                                  <label id={`families-dashboard-list-item-invites-usage-multi-label-${family.id}`} htmlFor={`families-dashboard-list-item-invites-usage-multi-input-${family.id}`} className="flex items-center gap-2 text-sm">
                                    <input
                                      id={`families-dashboard-list-item-invites-usage-multi-input-${family.id}`}
                                      type="radio"
                                      name={`invite-usage-type-${family.id}`}
                                      value="multi_use"
                                      checked={inviteUsageType === "multi_use"}
                                      onChange={() => {
                                        setInviteUsageTypeByFamilyId((current) => ({ ...current, [family.id]: "multi_use" }));
                                      }}
                                    />
                                    {familyMessages.inviteMultiUse}
                                  </label>
                                </div>
                              </fieldset>

                              {latestInviteUrl ? (
                                <div id={`families-dashboard-list-item-invites-latest-url-${family.id}`} className="space-y-2">
                                  <label id={`families-dashboard-list-item-invites-latest-url-label-${family.id}`} htmlFor={`families-dashboard-list-item-invites-latest-url-input-${family.id}`} className="block text-sm font-medium">
                                    {familyMessages.latestInviteUrlLabel}
                                  </label>
                                  <div id={`families-dashboard-list-item-invites-latest-url-row-${family.id}`} className="flex flex-wrap items-center gap-2">
                                    <input
                                      id={`families-dashboard-list-item-invites-latest-url-input-${family.id}`}
                                      readOnly
                                      value={latestInviteUrl}
                                      className="input-base min-w-[220px] flex-1"
                                    />
                                    <button
                                      id={`families-dashboard-list-item-invites-copy-btn-${family.id}`}
                                      type="button"
                                      className={buttonClassName("secondary")}
                                      onClick={() => {
                                        void handleCopyInviteUrl(family.id);
                                      }}
                                    >
                                      {familyMessages.copyUrl}
                                    </button>
                                  </div>
                                  <p id={`families-dashboard-list-item-invites-latest-url-note-${family.id}`} className="text-xs text-[var(--color-text-muted)]">
                                    {familyMessages.latestInviteUrlNote}
                                  </p>
                                </div>
                              ) : null}

                              {inviteLinks.length === 0 ? (
                                <p id={`families-dashboard-list-item-invites-empty-${family.id}`} className="text-sm text-[var(--color-text-muted)]">
                                  {familyMessages.inviteLinksEmpty}
                                </p>
                              ) : (
                                <ul id={`families-dashboard-list-item-invites-list-${family.id}`} className="space-y-2">
                                  {inviteLinks.map((inviteLink) => (
                                    <li
                                      id={`families-dashboard-list-item-invites-item-${family.id}-${inviteLink.id}`}
                                      key={inviteLink.id}
                                      className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3"
                                    >
                                      <div id={`families-dashboard-list-item-invites-item-content-${family.id}-${inviteLink.id}`} className="space-y-1">
                                        <p id={`families-dashboard-list-item-invites-item-state-${family.id}-${inviteLink.id}`} className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
                                          {inviteLink.state}
                                        </p>
                                        <p id={`families-dashboard-list-item-invites-item-created-${family.id}-${inviteLink.id}`} className="text-sm text-[var(--color-text-muted)]">
                                          {familyMessages.inviteCreatedLabel}: {formatTimestamp(inviteLink.createdAt)}
                                        </p>
                                        <p id={`families-dashboard-list-item-invites-item-usage-${family.id}-${inviteLink.id}`} className="text-sm text-[var(--color-text-muted)]">
                                          {familyMessages.inviteUsageLabel}:{" "}
                                          {inviteLink.usageType === "single_use"
                                            ? familyMessages.inviteSingleUse
                                            : familyMessages.inviteMultiUse}
                                        </p>
                                        <p id={`families-dashboard-list-item-invites-item-expires-${family.id}-${inviteLink.id}`} className="text-sm text-[var(--color-text-muted)]">
                                          {familyMessages.inviteExpiresLabel}: {formatTimestamp(inviteLink.expiresAt)}
                                        </p>
                                      </div>
                                      <div id={`families-dashboard-list-item-invites-item-actions-${family.id}-${inviteLink.id}`} className="mt-2 flex flex-wrap gap-2">
                                        <button
                                          id={`families-dashboard-list-item-invites-item-revoke-btn-${family.id}-${inviteLink.id}`}
                                          type="button"
                                          className={buttonClassName("secondary")}
                                          disabled={inviteLink.state !== "active" || busyActionKey === `invite-revoke-${family.id}-${inviteLink.id}`}
                                          onClick={() => {
                                            void handleRevokeInviteLink(family.id, inviteLink.id);
                                          }}
                                        >
                                          {busyActionKey === `invite-revoke-${family.id}-${inviteLink.id}`
                                            ? familyMessages.revokingInvite
                                            : familyMessages.revokeInvite}
                                        </button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ) : null}

                          {isAdmin && activeManageTab === "deletion" ? (
                            <div
                              id={`families-dashboard-list-item-deletion-section-${family.id}`}
                              role="tabpanel"
                              aria-labelledby={`families-dashboard-list-item-manage-secondary-menu-tab-${family.id}-deletion`}
                              className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3"
                            >
                              <h3 id={`families-dashboard-list-item-deletion-title-${family.id}`} className="text-base font-semibold">{familyMessages.deleteFamilyTitle}</h3>

                              {deletionRequest ? (
                                <>
                                  <p id={`families-dashboard-list-item-deletion-status-${family.id}`} className="text-sm text-[var(--color-text-muted)]">
                                    {familyMessages.deletionRequestPrefix} {deletionRequest.approveCount}/{deletionRequest.requiredApprovals}{" "}
                                    {familyMessages.deletionApprovalsSuffix} {familyMessages.deletionExpiresPrefix}{" "}
                                    {formatTimestamp(deletionRequest.expiresAt)}.
                                  </p>

                                  {currentUserVote ? (
                                    <p id={`families-dashboard-list-item-deletion-my-vote-${family.id}`} className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
                                      {familyMessages.yourVote}: {currentUserVote.vote}
                                    </p>
                                  ) : (
                                    <div id={`families-dashboard-list-item-deletion-vote-actions-${family.id}`} className="flex gap-2">
                                      <button
                                        id={`families-dashboard-list-item-deletion-approve-btn-${family.id}`}
                                        type="button"
                                        className={buttonClassName("primary")}
                                        disabled={busyActionKey === `delete-request-vote-approve-${family.id}-${deletionRequest.id}`}
                                        onClick={() => {
                                          void handleVoteDeletionRequest(family.id, deletionRequest.id, "approve");
                                        }}
                                      >
                                        {busyActionKey === `delete-request-vote-approve-${family.id}-${deletionRequest.id}`
                                          ? familyMessages.submittingVote
                                          : familyMessages.approveDeletion}
                                      </button>
                                      <button
                                        id={`families-dashboard-list-item-deletion-deny-btn-${family.id}`}
                                        type="button"
                                        className={buttonClassName("secondary")}
                                        disabled={busyActionKey === `delete-request-vote-deny-${family.id}-${deletionRequest.id}`}
                                        onClick={() => {
                                          void handleVoteDeletionRequest(family.id, deletionRequest.id, "deny");
                                        }}
                                      >
                                        {busyActionKey === `delete-request-vote-deny-${family.id}-${deletionRequest.id}`
                                          ? familyMessages.submittingVote
                                          : familyMessages.denyDeletion}
                                      </button>
                                    </div>
                                  )}

                                  {detail.currentUserId === deletionRequest.initiatedByUserId ? (
                                    <button
                                      id={`families-dashboard-list-item-deletion-cancel-btn-${family.id}`}
                                      type="button"
                                      className={buttonClassName("secondary")}
                                      disabled={busyActionKey === `delete-request-cancel-${family.id}-${deletionRequest.id}`}
                                      onClick={() => {
                                        void handleCancelDeletionRequest(family.id, deletionRequest.id);
                                      }}
                                    >
                                      {busyActionKey === `delete-request-cancel-${family.id}-${deletionRequest.id}`
                                        ? familyMessages.cancellingDeletion
                                        : familyMessages.cancelDeletionRequest}
                                    </button>
                                  ) : null}
                                </>
                              ) : (
                                <>
                                  {cooldownUntil && new Date(cooldownUntil) > new Date() ? (
                                    <p id={`families-dashboard-list-item-deletion-cooldown-${family.id}`} className="text-sm text-[var(--color-text-muted)]">
                                      {familyMessages.deletionCooldownPrefix} {formatTimestamp(cooldownUntil)}
                                      {familyMessages.deletionCooldownSuffix}
                                    </p>
                                  ) : (
                                    <button
                                      id={`families-dashboard-list-item-deletion-create-btn-${family.id}`}
                                      type="button"
                                      className={buttonClassName("danger")}
                                      disabled={!canInitiateDeletion || busyActionKey === `delete-request-create-${family.id}`}
                                      onClick={() => {
                                        void handleInitiateDeletionRequest(family.id);
                                      }}
                                    >
                                      {busyActionKey === `delete-request-create-${family.id}`
                                        ? familyMessages.creatingSubmit
                                        : familyMessages.requestFamilyDeletion}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          ) : null}

                          {familyMessage ? (
                            <p id={`families-dashboard-list-item-manage-message-${family.id}`} className="text-sm text-[var(--color-primary)]">{familyMessage}</p>
                          ) : null}

                          {familyError ? (
                            <p id={`families-dashboard-list-item-manage-error-${family.id}`} className="text-sm text-[var(--color-danger)]">{familyError}</p>
                          ) : null}
                        </>
                      ) : (
                        <p id={`families-dashboard-list-item-manage-empty-${family.id}`} className="text-sm text-[var(--color-text-muted)]">{familyMessages.familyDetailsEmpty}</p>
                      )}
                    </section>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section id="families-dashboard-pending-invites-section" data-motion-order="3" className="families-motion-section surface-panel space-y-4 p-6 sm:p-8">
        <h2 id="families-dashboard-pending-invites-title" className="text-xl font-semibold">{familyMessages.pendingInvitesTitle}</h2>
        {isLoading ? (
          <p id="families-dashboard-pending-invites-loading" className="text-sm text-[var(--color-text-muted)]">{familyMessages.pendingInvitesLoading}</p>
        ) : pendingInvites.length === 0 ? (
          <p id="families-dashboard-pending-invites-empty" className="text-sm text-[var(--color-text-muted)]">{familyMessages.pendingInvitesEmpty}</p>
        ) : (
          <ul id="families-dashboard-pending-invites-list" className="space-y-3">
            {pendingInvites.map((item, index) => (
              <li
                id={`families-dashboard-pending-invite-item-${item.inviteId}`}
                key={item.inviteId}
                className="families-motion-card surface-card p-4"
                style={{ animationDelay: `${210 + index * 55}ms` }}
              >
                <p id={`families-dashboard-pending-invite-family-name-${item.inviteId}`} className="font-semibold">{item.family.name}</p>
                <p id={`families-dashboard-pending-invite-family-description-${item.inviteId}`} className="text-sm text-[var(--color-text-muted)]">
                  {item.family.description ?? familyMessages.pendingInviteDescriptionEmpty}
                </p>
                <p id={`families-dashboard-pending-invite-status-${item.inviteId}`} className="mt-2 text-xs uppercase tracking-wide text-[var(--color-primary)]">
                  {item.decisionStatus} / {item.invite.state}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
