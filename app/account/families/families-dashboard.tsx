"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { buttonClassName } from "@/app/_components/ui/button-styles";

type Family = {
  id: number;
  name: string;
  description: string | null;
  pictureUrl: string | null;
  role: "admin" | "member";
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

type FamiliesResponse = {
  families?: Family[];
  error?: string;
};

type InvitesResponse = {
  invites?: Invite[];
  error?: string;
};

export default function FamiliesDashboard() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  async function loadData() {
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
        setError(familiesData.error ?? "Failed to load families");
        return;
      }

      if (!invitesResponse.ok) {
        setError(invitesData.error ?? "Failed to load pending invites");
        return;
      }

      setFamilies(familiesData.families ?? []);
      setPendingInvites(invitesData.invites ?? []);
    } catch {
      setError("Failed to load family dashboard");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

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

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Failed to create family");
        return;
      }

      form.reset();
      await loadData();
    } catch {
      setError("Failed to create family");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main id="families-dashboard-main" className="app-shell max-w-4xl space-y-6">
      <section id="families-dashboard-header-section" className="surface-panel space-y-4 p-6 sm:p-8">
        <div id="families-dashboard-header-row" className="flex items-center justify-between gap-3">
          <h1 id="families-dashboard-title" className="text-2xl font-semibold">My Families</h1>
          <Link id="families-dashboard-back-link" href="/" className="text-link text-sm">
            Back to recipes
          </Link>
        </div>

        <form id="families-dashboard-create-form" onSubmit={handleCreateFamily} className="space-y-3">
          <div id="families-dashboard-create-name-field">
            <label id="families-dashboard-create-name-label" htmlFor="family_name" className="mb-1 block text-sm font-medium">
              Family name
            </label>
            <input id="family_name" name="name" required className="input-base" />
          </div>

          <div id="families-dashboard-create-description-field">
            <label id="families-dashboard-create-description-label" htmlFor="family_description" className="mb-1 block text-sm font-medium">
              Family description
            </label>
            <textarea id="family_description" name="description" rows={2} className="input-base" />
          </div>

          <div id="families-dashboard-create-picture-field">
            <label id="families-dashboard-create-picture-label" htmlFor="family_picture_storage_key" className="mb-1 block text-sm font-medium">
              Family picture storage key (optional)
            </label>
            <input id="family_picture_storage_key" name="pictureStorageKey" className="input-base" />
          </div>

          {error ? <p id="families-dashboard-error-message" className="text-sm text-[var(--color-danger)]">{error}</p> : null}

          <button id="families-dashboard-create-submit-btn" type="submit" disabled={isCreating} className={buttonClassName("primary")}>
            {isCreating ? "Creating..." : "Create family"}
          </button>
        </form>
      </section>

      <section id="families-dashboard-list-section" className="surface-panel space-y-4 p-6 sm:p-8">
        <h2 id="families-dashboard-list-title" className="text-xl font-semibold">Families you belong to</h2>
        {isLoading ? (
          <p id="families-dashboard-list-loading" className="text-sm text-[var(--color-text-muted)]">Loading families...</p>
        ) : families.length === 0 ? (
          <p id="families-dashboard-list-empty" className="text-sm text-[var(--color-text-muted)]">No families yet. Create your first one above.</p>
        ) : (
          <ul id="families-dashboard-list" className="space-y-3">
            {families.map((family) => (
              <li id={`families-dashboard-list-item-${family.id}`} key={family.id} className="surface-card flex items-start justify-between gap-4 p-4">
                <div id={`families-dashboard-list-item-content-${family.id}`} className="space-y-1">
                  <p id={`families-dashboard-list-item-name-${family.id}`} className="text-lg font-semibold">{family.name}</p>
                  {family.description ? (
                    <p id={`families-dashboard-list-item-description-${family.id}`} className="text-sm text-[var(--color-text-muted)]">{family.description}</p>
                  ) : (
                    <p id={`families-dashboard-list-item-description-empty-${family.id}`} className="text-sm text-[var(--color-text-muted)]">No description yet</p>
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
                    No image
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="families-dashboard-pending-invites-section" className="surface-panel space-y-4 p-6 sm:p-8">
        <h2 id="families-dashboard-pending-invites-title" className="text-xl font-semibold">Pending invites</h2>
        {isLoading ? (
          <p id="families-dashboard-pending-invites-loading" className="text-sm text-[var(--color-text-muted)]">Loading pending invites...</p>
        ) : pendingInvites.length === 0 ? (
          <p id="families-dashboard-pending-invites-empty" className="text-sm text-[var(--color-text-muted)]">No pending invites.</p>
        ) : (
          <ul id="families-dashboard-pending-invites-list" className="space-y-3">
            {pendingInvites.map((item) => (
              <li id={`families-dashboard-pending-invite-item-${item.inviteId}`} key={item.inviteId} className="surface-card p-4">
                <p id={`families-dashboard-pending-invite-family-name-${item.inviteId}`} className="font-semibold">{item.family.name}</p>
                <p id={`families-dashboard-pending-invite-family-description-${item.inviteId}`} className="text-sm text-[var(--color-text-muted)]">
                  {item.family.description ?? "No description"}
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
