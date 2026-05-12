"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import FamilySecondaryTabs from "@/app/account/families/_components/family-secondary-tabs";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import {
  buildDeletionWorkflowSummary,
  buildDirectInviteAdminRows,
  buildLeaveFamilyPermission,
  buildMemberActionPermissions,
  buildPendingInviteActionSummary,
  buildSelectedFamilyStepTabs,
  buildTopLevelManageTabs,
} from "@/lib/application/families/manage-family-workspace";
import { type ManageFamilySelectedStep, type ManageFamilyTopTab } from "@/lib/application/families/workflow-state";
import { type Messages } from "@/lib/i18n/messages";

export type Family = {
  id: number;
  name: string;
  description: string | null;
  pictureUrl: string | null;
  role: "admin" | "member";
};

export type FamilyMember = {
  userId: number;
  role: "admin" | "member";
  joinedAt: string;
  username: string;
  firstName: string;
  lastName: string;
};

export type FamilyDetail = {
  id: number;
  name: string;
  description: string | null;
  pictureUrl: string | null;
  currentUserId: number;
  currentUserRole: "admin" | "member";
  members: FamilyMember[];
};

export type DeletionVote = {
  userId: number;
  vote: "approve" | "deny";
  votedAt: string;
};

export type DeletionRequest = {
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

export type Invite = {
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
    inviteType?: string;
    targetUsername?: string | null;
  };
};

export type FamilyInviteLink = {
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

export type FamilyDirectInvite = {
  id: number;
  familyId: number;
  createdByUserId: number;
  targetUserId: number | null;
  targetUsername: string | null;
  inviteType: "direct";
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  consumedAt: string | null;
  consumedByUserId: number | null;
  maxUses: number;
  usageType: "single_use";
  state: "active" | "revoked" | "consumed" | "expired";
};

type FamilyMessages = Messages["family"];
type InviteUsageType = "single_use" | "multi_use";

type ManageFamiliesWorkspaceProps = {
  activeSelectedStep: ManageFamilySelectedStep;
  activeTopTab: ManageFamilyTopTab;
  busyActionKey: string | null;
  cooldownsByFamilyId: Record<number, string | null>;
  deletionRequestsByFamilyId: Record<number, DeletionRequest | null>;
  error: string | null;
  families: Family[];
  familyDetailsById: Record<number, FamilyDetail>;
  familyDirectInvitesById: Record<number, FamilyDirectInvite[]>;
  familyErrorsById: Record<number, string | null>;
  familyInviteLinksById: Record<number, FamilyInviteLink[]>;
  familyMessages: FamilyMessages;
  familyMessagesById: Record<number, string | null>;
  formatTimestamp: (value: string) => string;
  inviteUsageTypeByFamilyId: Record<number, InviteUsageType>;
  isLoading: boolean;
  latestInviteUrlByFamilyId: Record<number, string | null>;
  loadingFamilyId: number | null;
  onCancelDeletionRequest: (familyId: number, requestId: number) => void;
  onCopyInviteUrl: (familyId: number) => void;
  onCreateInviteLink: (familyId: number) => void;
  onDeleteInviteLink: (familyId: number, inviteId: number) => void;
  onInitiateDeletionRequest: (familyId: number) => void;
  onLeaveFamily: (familyId: number, requiresConfirmDelete: boolean) => void;
  onPendingInviteAction: (inviteId: number, action: "accept" | "decline" | "undo-decline") => void;
  onPromoteMember: (familyId: number, userId: number) => void;
  onDemoteMember: (familyId: number, userId: number) => void;
  onRemoveMember: (familyId: number, userId: number) => void;
  onRevokeDirectInvite: (familyId: number, inviteId: number) => void;
  onSelectFamily: (familyId: number) => void;
  onSelectedStepSelect: (step: ManageFamilySelectedStep) => void;
  onTopTabSelect: (tab: ManageFamilyTopTab) => void;
  onUsageTypeChange: (familyId: number, usageType: InviteUsageType) => void;
  onVoteDeletionRequest: (familyId: number, requestId: number, vote: "approve" | "deny") => void;
  pendingInvites: Invite[];
  selectedFamilyId: number | null;
};

export default function ManageFamiliesWorkspace({
  activeSelectedStep,
  activeTopTab,
  busyActionKey,
  cooldownsByFamilyId,
  deletionRequestsByFamilyId,
  error,
  families,
  familyDetailsById,
  familyDirectInvitesById,
  familyErrorsById,
  familyInviteLinksById,
  familyMessages,
  familyMessagesById,
  formatTimestamp,
  inviteUsageTypeByFamilyId,
  isLoading,
  latestInviteUrlByFamilyId,
  loadingFamilyId,
  onCancelDeletionRequest,
  onCopyInviteUrl,
  onCreateInviteLink,
  onDeleteInviteLink,
  onInitiateDeletionRequest,
  onLeaveFamily,
  onPendingInviteAction,
  onPromoteMember,
  onDemoteMember,
  onRemoveMember,
  onRevokeDirectInvite,
  onSelectFamily,
  onSelectedStepSelect,
  onTopTabSelect,
  onUsageTypeChange,
  onVoteDeletionRequest,
  pendingInvites,
  selectedFamilyId,
}: ManageFamiliesWorkspaceProps) {
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const selectedFamily = families.find((family) => family.id === selectedFamilyId) ?? null;
  const topTabs = buildTopLevelManageTabs({
    activeTab: activeTopTab,
    hasSelectedFamily: selectedFamily !== null,
  });
  const selectedStepTabs = buildSelectedFamilyStepTabs({ activeStep: activeSelectedStep });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const updateLayout = () => {
      setIsMobileLayout(mediaQuery.matches);
    };

    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);

    return () => {
      mediaQuery.removeEventListener("change", updateLayout);
    };
  }, []);

  return (
    <section id="manage-families-workspace-section" className="families-motion-section surface-panel space-y-5 p-5 sm:p-6">
      <FamilySecondaryTabs
        idPrefix="manage-families-top"
        ariaLabel="Manage families sections"
        activeTab={topTabs.find((tab) => tab.isActive)?.id ?? activeTopTab}
        tabs={topTabs}
        onTabSelect={onTopTabSelect}
      />

      {error ? <p id="manage-families-error-message" className="text-sm text-[var(--color-danger)]">{error}</p> : null}

      {!isMobileLayout ? (
        <div id="manage-families-desktop-layout" className="grid gap-5 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.4fr)]">
          <div id="manage-families-desktop-list-zone" className="space-y-4">
            {activeTopTab === "pending-invites" ? (
              <PendingInvitesPanel
                familyMessages={familyMessages}
                isLoading={isLoading}
                pendingInvites={pendingInvites}
                formatTimestamp={formatTimestamp}
                busyActionKey={busyActionKey}
                onPendingInviteAction={onPendingInviteAction}
              />
            ) : (
              <FamilyListPanel
                busyActionKey={busyActionKey}
                families={families}
                familyDetailsById={familyDetailsById}
                familyMessages={familyMessages}
                isLoading={isLoading}
                onLeaveFamily={onLeaveFamily}
                onSelectFamily={onSelectFamily}
                selectedFamilyId={selectedFamilyId}
              />
            )}
          </div>

          <SelectedFamilyWorkspace
            activeSelectedStep={activeSelectedStep}
            busyActionKey={busyActionKey}
            cooldownsByFamilyId={cooldownsByFamilyId}
            deletionRequestsByFamilyId={deletionRequestsByFamilyId}
            family={selectedFamily}
            familyDetailsById={familyDetailsById}
            familyDirectInvitesById={familyDirectInvitesById}
            familyErrorsById={familyErrorsById}
            familyInviteLinksById={familyInviteLinksById}
            familyMessages={familyMessages}
            familyMessagesById={familyMessagesById}
            formatTimestamp={formatTimestamp}
            inviteUsageTypeByFamilyId={inviteUsageTypeByFamilyId}
            latestInviteUrlByFamilyId={latestInviteUrlByFamilyId}
            loadingFamilyId={loadingFamilyId}
            onCancelDeletionRequest={onCancelDeletionRequest}
            onCopyInviteUrl={onCopyInviteUrl}
            onCreateInviteLink={onCreateInviteLink}
            onDeleteInviteLink={onDeleteInviteLink}
            onInitiateDeletionRequest={onInitiateDeletionRequest}
            onPromoteMember={onPromoteMember}
            onDemoteMember={onDemoteMember}
            onRemoveMember={onRemoveMember}
            onRevokeDirectInvite={onRevokeDirectInvite}
            onSelectedStepSelect={onSelectedStepSelect}
            onUsageTypeChange={onUsageTypeChange}
            onVoteDeletionRequest={onVoteDeletionRequest}
            selectedStepTabs={selectedStepTabs}
          />
        </div>
      ) : (
        <div id="manage-families-mobile-layout" className="space-y-5">
        {activeTopTab === "pending-invites" ? (
          <PendingInvitesPanel
            familyMessages={familyMessages}
            isLoading={isLoading}
            pendingInvites={pendingInvites}
            formatTimestamp={formatTimestamp}
            busyActionKey={busyActionKey}
            onPendingInviteAction={onPendingInviteAction}
          />
        ) : (
          <FamilyListPanel
            busyActionKey={busyActionKey}
            families={families}
            familyDetailsById={familyDetailsById}
            familyMessages={familyMessages}
            isLoading={isLoading}
            onLeaveFamily={onLeaveFamily}
            onSelectFamily={onSelectFamily}
            selectedFamilyId={selectedFamilyId}
          />
        )}

        {selectedFamily ? (
          <div id="manage-families-mobile-selected-family-zone" className="space-y-4">
            <SelectedFamilySummary family={selectedFamily} familyMessages={familyMessages} />
            <SelectedFamilyWorkspace
              activeSelectedStep={activeSelectedStep}
              busyActionKey={busyActionKey}
              cooldownsByFamilyId={cooldownsByFamilyId}
              deletionRequestsByFamilyId={deletionRequestsByFamilyId}
              family={selectedFamily}
              familyDetailsById={familyDetailsById}
              familyDirectInvitesById={familyDirectInvitesById}
              familyErrorsById={familyErrorsById}
              familyInviteLinksById={familyInviteLinksById}
              familyMessages={familyMessages}
              familyMessagesById={familyMessagesById}
              formatTimestamp={formatTimestamp}
              inviteUsageTypeByFamilyId={inviteUsageTypeByFamilyId}
              latestInviteUrlByFamilyId={latestInviteUrlByFamilyId}
              loadingFamilyId={loadingFamilyId}
              onCancelDeletionRequest={onCancelDeletionRequest}
              onCopyInviteUrl={onCopyInviteUrl}
              onCreateInviteLink={onCreateInviteLink}
              onDeleteInviteLink={onDeleteInviteLink}
              onInitiateDeletionRequest={onInitiateDeletionRequest}
              onPromoteMember={onPromoteMember}
              onDemoteMember={onDemoteMember}
              onRemoveMember={onRemoveMember}
              onRevokeDirectInvite={onRevokeDirectInvite}
              onSelectedStepSelect={onSelectedStepSelect}
              onUsageTypeChange={onUsageTypeChange}
              onVoteDeletionRequest={onVoteDeletionRequest}
              selectedStepTabs={selectedStepTabs}
            />
          </div>
        ) : null}
        </div>
      )}
    </section>
  );
}

function FamilyListPanel({
  busyActionKey,
  families,
  familyDetailsById,
  familyMessages,
  isLoading,
  onLeaveFamily,
  onSelectFamily,
  selectedFamilyId,
}: {
  busyActionKey: string | null;
  families: Family[];
  familyDetailsById: Record<number, FamilyDetail>;
  familyMessages: FamilyMessages;
  isLoading: boolean;
  onLeaveFamily: (familyId: number, requiresConfirmDelete: boolean) => void;
  onSelectFamily: (familyId: number) => void;
  selectedFamilyId: number | null;
}) {
  if (isLoading) {
    return <p id="manage-families-list-loading" className="text-sm text-[var(--color-text-muted)]">{familyMessages.listLoading}</p>;
  }

  if (families.length === 0) {
    return <p id="manage-families-list-empty" className="text-sm text-[var(--color-text-muted)]">{familyMessages.listEmpty}</p>;
  }

  return (
    <section id="manage-families-list-panel" className="space-y-3">
      <h2 id="manage-families-list-title" className="text-lg font-semibold">{familyMessages.listTitle}</h2>
      <ul id="manage-families-list" className="space-y-3">
        {families.map((family) => {
          const detail = familyDetailsById[family.id];
          const memberCount = detail?.members.length ?? 0;
          const adminCount = detail?.members.filter((member) => member.role === "admin").length ?? 0;
          const leavePermission = buildLeaveFamilyPermission({
            currentUserRole: detail?.currentUserRole ?? family.role,
            adminCount,
            memberCount: memberCount || 1,
          });

          return (
            <li
              id={`manage-families-list-item-${family.id}`}
              key={family.id}
              className="surface-card grid gap-3 p-4"
              data-selected={selectedFamilyId === family.id}
            >
              <div id={`manage-families-list-item-summary-${family.id}`} className="flex items-start gap-3">
                <FamilyPicture idPrefix={`manage-families-list-item-picture-${family.id}`} family={family} familyMessages={familyMessages} size="sm" />
                <div id={`manage-families-list-item-copy-${family.id}`} className="min-w-0 flex-1">
                  <p id={`manage-families-list-item-name-${family.id}`} className="font-semibold">{family.name}</p>
                  <p id={`manage-families-list-item-description-${family.id}`} className="line-clamp-2 text-sm text-[var(--color-text-muted)]">
                    {family.description || familyMessages.descriptionEmpty}
                  </p>
                  <p id={`manage-families-list-item-role-${family.id}`} className="mt-1 text-xs uppercase tracking-wide text-[var(--color-primary)]">
                    {family.role}
                  </p>
                </div>
              </div>
              <div id={`manage-families-list-item-actions-${family.id}`} className="flex flex-wrap gap-2">
                <button
                  id={`manage-families-list-item-select-btn-${family.id}`}
                  type="button"
                  className={buttonClassName("primary")}
                  onClick={() => onSelectFamily(family.id)}
                >
                  {family.role === "admin" ? familyMessages.manageFamily : familyMessages.viewMembers}
                </button>
                <button
                  id={`manage-families-list-item-leave-btn-${family.id}`}
                  type="button"
                  className={buttonClassName("secondary")}
                  disabled={!leavePermission.canLeave || busyActionKey === `leave-${family.id}`}
                  title={leavePermission.reason ?? undefined}
                  onClick={() => onLeaveFamily(family.id, leavePermission.requiresConfirmDelete)}
                >
                  {busyActionKey === `leave-${family.id}` ? familyMessages.leavingFamily : familyMessages.leaveFamily}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PendingInvitesPanel({
  busyActionKey,
  familyMessages,
  formatTimestamp,
  isLoading,
  onPendingInviteAction,
  pendingInvites,
}: {
  busyActionKey: string | null;
  familyMessages: FamilyMessages;
  formatTimestamp: (value: string) => string;
  isLoading: boolean;
  onPendingInviteAction: (inviteId: number, action: "accept" | "decline" | "undo-decline") => void;
  pendingInvites: Invite[];
}) {
  if (isLoading) {
    return (
      <p id="manage-families-pending-invites-loading" className="text-sm text-[var(--color-text-muted)]">
        {familyMessages.pendingInvitesLoading}
      </p>
    );
  }

  if (pendingInvites.length === 0) {
    return (
      <p id="manage-families-pending-invites-empty" className="text-sm text-[var(--color-text-muted)]">
        {familyMessages.pendingInvitesEmpty}
      </p>
    );
  }

  return (
    <section id="manage-families-pending-invites-panel" className="space-y-3">
      <h2 id="manage-families-pending-invites-title" className="text-lg font-semibold">{familyMessages.pendingInvitesTitle}</h2>
      <ul id="manage-families-pending-invites-list" className="space-y-3">
        {pendingInvites.map((item) => {
          const actionSummary = buildPendingInviteActionSummary({
            decisionStatus: item.decisionStatus,
            inviteState: item.invite.state,
          });

          return (
            <li id={`manage-families-pending-invite-item-${item.inviteId}`} key={item.inviteId} className="surface-card grid gap-2 p-4">
              <p id={`manage-families-pending-invite-name-${item.inviteId}`} className="font-semibold">{item.family.name}</p>
              <p id={`manage-families-pending-invite-description-${item.inviteId}`} className="text-sm text-[var(--color-text-muted)]">
                {item.family.description ?? familyMessages.pendingInviteDescriptionEmpty}
              </p>
              <p id={`manage-families-pending-invite-status-${item.inviteId}`} className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
                {actionSummary.statusLabel} · {formatTimestamp(item.invite.expiresAt)}
              </p>
              <div id={`manage-families-pending-invite-actions-${item.inviteId}`} className="flex flex-wrap gap-2">
                {actionSummary.primaryAction ? (
                  <button
                    id={`manage-families-pending-invite-primary-btn-${item.inviteId}`}
                    type="button"
                    className={buttonClassName("primary")}
                    disabled={busyActionKey === `pending-invite-${actionSummary.primaryAction}-${item.inviteId}`}
                    onClick={() => onPendingInviteAction(item.inviteId, actionSummary.primaryAction!)}
                  >
                    {actionSummary.primaryAction === "accept" ? familyMessages.inviteAccept : familyMessages.inviteUndoDecline}
                  </button>
                ) : null}
                {actionSummary.secondaryAction ? (
                  <button
                    id={`manage-families-pending-invite-secondary-btn-${item.inviteId}`}
                    type="button"
                    className={buttonClassName("secondary")}
                    disabled={busyActionKey === `pending-invite-decline-${item.inviteId}`}
                    onClick={() => onPendingInviteAction(item.inviteId, "decline")}
                  >
                    {familyMessages.inviteDecline}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SelectedFamilySummary({ family, familyMessages }: { family: Family; familyMessages: FamilyMessages }) {
  return (
    <section id="manage-families-selected-summary" className="surface-card flex items-start gap-3 p-4" tabIndex={-1}>
      <FamilyPicture idPrefix="manage-families-selected-summary-picture" family={family} familyMessages={familyMessages} size="md" />
      <div id="manage-families-selected-summary-copy" className="min-w-0">
        <p id="manage-families-selected-summary-title" className="text-lg font-semibold">{family.name}</p>
        <p id="manage-families-selected-summary-description" className="text-sm text-[var(--color-text-muted)]">
          {family.description || familyMessages.descriptionEmpty}
        </p>
      </div>
    </section>
  );
}

function SelectedFamilyWorkspace({
  activeSelectedStep,
  busyActionKey,
  cooldownsByFamilyId,
  deletionRequestsByFamilyId,
  family,
  familyDetailsById,
  familyDirectInvitesById,
  familyErrorsById,
  familyInviteLinksById,
  familyMessages,
  familyMessagesById,
  formatTimestamp,
  inviteUsageTypeByFamilyId,
  latestInviteUrlByFamilyId,
  loadingFamilyId,
  onCancelDeletionRequest,
  onCopyInviteUrl,
  onCreateInviteLink,
  onDeleteInviteLink,
  onInitiateDeletionRequest,
  onPromoteMember,
  onDemoteMember,
  onRemoveMember,
  onRevokeDirectInvite,
  onSelectedStepSelect,
  onUsageTypeChange,
  onVoteDeletionRequest,
  selectedStepTabs,
}: {
  activeSelectedStep: ManageFamilySelectedStep;
  busyActionKey: string | null;
  cooldownsByFamilyId: Record<number, string | null>;
  deletionRequestsByFamilyId: Record<number, DeletionRequest | null>;
  family: Family | null;
  familyDetailsById: Record<number, FamilyDetail>;
  familyDirectInvitesById: Record<number, FamilyDirectInvite[]>;
  familyErrorsById: Record<number, string | null>;
  familyInviteLinksById: Record<number, FamilyInviteLink[]>;
  familyMessages: FamilyMessages;
  familyMessagesById: Record<number, string | null>;
  formatTimestamp: (value: string) => string;
  inviteUsageTypeByFamilyId: Record<number, InviteUsageType>;
  latestInviteUrlByFamilyId: Record<number, string | null>;
  loadingFamilyId: number | null;
  onCancelDeletionRequest: (familyId: number, requestId: number) => void;
  onCopyInviteUrl: (familyId: number) => void;
  onCreateInviteLink: (familyId: number) => void;
  onDeleteInviteLink: (familyId: number, inviteId: number) => void;
  onInitiateDeletionRequest: (familyId: number) => void;
  onPromoteMember: (familyId: number, userId: number) => void;
  onDemoteMember: (familyId: number, userId: number) => void;
  onRemoveMember: (familyId: number, userId: number) => void;
  onRevokeDirectInvite: (familyId: number, inviteId: number) => void;
  onSelectedStepSelect: (step: ManageFamilySelectedStep) => void;
  onUsageTypeChange: (familyId: number, usageType: InviteUsageType) => void;
  onVoteDeletionRequest: (familyId: number, requestId: number, vote: "approve" | "deny") => void;
  selectedStepTabs: Array<{ id: ManageFamilySelectedStep; label: string; isActive: boolean }>;
}) {
  if (!family) {
    return (
      <section id="manage-families-selected-empty" className="surface-card grid min-h-[280px] place-items-center p-6 text-center">
        <p id="manage-families-selected-empty-copy" className="text-sm text-[var(--color-text-muted)]">
          {familyMessages.familyDetailsEmpty}
        </p>
      </section>
    );
  }

  const detail = familyDetailsById[family.id];
  const familyMessage = familyMessagesById[family.id];
  const familyError = familyErrorsById[family.id];

  return (
    <section id="manage-families-selected-workspace" className="surface-card space-y-4 p-4">
      <div id="manage-families-selected-header" className="flex flex-wrap items-start justify-between gap-3">
        <div id="manage-families-selected-header-copy">
          <p id="manage-family-selected-heading" className="text-xl font-semibold" tabIndex={-1}>{family.name}</p>
          <p id="manage-families-selected-role" className="text-sm text-[var(--color-text-muted)]">
            {family.role}
          </p>
        </div>
      </div>

      <FamilySecondaryTabs
        idPrefix="manage-families-selected"
        ariaLabel="Selected family sections"
        activeTab={activeSelectedStep}
        tabs={selectedStepTabs}
        onTabSelect={onSelectedStepSelect}
      />

      {loadingFamilyId === family.id ? (
        <p id={`manage-families-selected-loading-${family.id}`} className="text-sm text-[var(--color-text-muted)]">
          {familyMessages.familyDetailsLoading}
        </p>
      ) : detail ? (
        <>
          {activeSelectedStep === "overview" ? (
            <OverviewPanel family={family} detail={detail} familyMessages={familyMessages} />
          ) : null}
          {activeSelectedStep === "members" ? (
            <MembersPanel
              busyActionKey={busyActionKey}
              detail={detail}
              familyMessages={familyMessages}
              onPromoteMember={onPromoteMember}
              onDemoteMember={onDemoteMember}
              onRemoveMember={onRemoveMember}
            />
          ) : null}
          {activeSelectedStep === "invites" ? (
            <InvitesPanel
              busyActionKey={busyActionKey}
              detail={detail}
              familyMessages={familyMessages}
              formatTimestamp={formatTimestamp}
              directInvites={familyDirectInvitesById[family.id] ?? []}
              inviteLinks={familyInviteLinksById[family.id] ?? []}
              inviteUsageType={inviteUsageTypeByFamilyId[family.id] ?? "single_use"}
              latestInviteUrl={latestInviteUrlByFamilyId[family.id] ?? null}
              onCopyInviteUrl={onCopyInviteUrl}
              onCreateInviteLink={onCreateInviteLink}
              onDeleteInviteLink={onDeleteInviteLink}
              onRevokeDirectInvite={onRevokeDirectInvite}
              onUsageTypeChange={onUsageTypeChange}
            />
          ) : null}
          {activeSelectedStep === "safety" ? (
            <SafetyPanel
              busyActionKey={busyActionKey}
              cooldownUntil={cooldownsByFamilyId[family.id] ?? null}
              deletionRequest={deletionRequestsByFamilyId[family.id] ?? null}
              detail={detail}
              familyMessages={familyMessages}
              formatTimestamp={formatTimestamp}
              onCancelDeletionRequest={onCancelDeletionRequest}
              onInitiateDeletionRequest={onInitiateDeletionRequest}
              onVoteDeletionRequest={onVoteDeletionRequest}
            />
          ) : null}
          {familyMessage ? <p id={`manage-families-selected-message-${family.id}`} className="warm-status-message">{familyMessage}</p> : null}
          {familyError ? <p id={`manage-families-selected-error-${family.id}`} className="text-sm text-[var(--color-danger)]">{familyError}</p> : null}
        </>
      ) : (
        <p id={`manage-families-selected-empty-${family.id}`} className="text-sm text-[var(--color-text-muted)]">
          {familyMessages.familyDetailsEmpty}
        </p>
      )}
    </section>
  );
}

function OverviewPanel({ detail, family, familyMessages }: { detail: FamilyDetail; family: Family; familyMessages: FamilyMessages }) {
  return (
    <section id={`manage-families-overview-panel-${family.id}`} className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
      <FamilyPicture idPrefix={`manage-families-overview-picture-${family.id}`} family={family} familyMessages={familyMessages} size="lg" />
      <div id={`manage-families-overview-copy-${family.id}`} className="space-y-2">
        <h2 id={`manage-families-overview-title-${family.id}`} className="text-lg font-semibold">{family.name}</h2>
        <p id={`manage-families-overview-description-${family.id}`} className="text-sm text-[var(--color-text-muted)]">
          {family.description || familyMessages.descriptionEmpty}
        </p>
        <p id={`manage-families-overview-meta-${family.id}`} className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
          {detail.members.length} {familyMessages.membersTitle} · {detail.currentUserRole}
        </p>
      </div>
    </section>
  );
}

function MembersPanel({
  busyActionKey,
  detail,
  familyMessages,
  onPromoteMember,
  onDemoteMember,
  onRemoveMember,
}: {
  busyActionKey: string | null;
  detail: FamilyDetail;
  familyMessages: FamilyMessages;
  onPromoteMember: (familyId: number, userId: number) => void;
  onDemoteMember: (familyId: number, userId: number) => void;
  onRemoveMember: (familyId: number, userId: number) => void;
}) {
  return (
    <section id={`manage-families-members-panel-${detail.id}`} className="space-y-3">
      <h2 id={`manage-families-members-title-${detail.id}`} className="text-lg font-semibold">{familyMessages.membersTitle}</h2>
      <ul id={`manage-families-members-list-${detail.id}`} className="space-y-2">
        {detail.members.map((member) => {
          const permissions = buildMemberActionPermissions({
            currentUserId: detail.currentUserId,
            currentUserRole: detail.currentUserRole,
            memberUserId: member.userId,
            memberRole: member.role,
          });

          return (
            <li id={`manage-families-member-item-${detail.id}-${member.userId}`} key={member.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
              <div id={`manage-families-member-copy-${detail.id}-${member.userId}`}>
                <p id={`manage-families-member-name-${detail.id}-${member.userId}`} className="text-sm font-medium">
                  {member.firstName} {member.lastName} ({member.username})
                </p>
                <p id={`manage-families-member-role-${detail.id}-${member.userId}`} className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                  {member.role}
                </p>
              </div>
              <div id={`manage-families-member-actions-${detail.id}-${member.userId}`} className="flex flex-wrap gap-2">
                {permissions.canPromote ? (
                  <button
                    id={`manage-families-member-promote-btn-${detail.id}-${member.userId}`}
                    type="button"
                    className={buttonClassName("secondary")}
                    disabled={busyActionKey === `promote-${detail.id}-${member.userId}`}
                    onClick={() => onPromoteMember(detail.id, member.userId)}
                  >
                    {busyActionKey === `promote-${detail.id}-${member.userId}` ? familyMessages.promotingMember : familyMessages.promoteToAdmin}
                  </button>
                ) : null}
                {permissions.canDemote ? (
                  <button
                    id={`manage-families-member-demote-btn-${detail.id}-${member.userId}`}
                    type="button"
                    className={buttonClassName("secondary")}
                    disabled={busyActionKey === `demote-${detail.id}-${member.userId}`}
                    onClick={() => onDemoteMember(detail.id, member.userId)}
                  >
                    {busyActionKey === `demote-${detail.id}-${member.userId}` ? familyMessages.promotingMember : "Demote"}
                  </button>
                ) : null}
                {permissions.canRemove ? (
                  <button
                    id={`manage-families-member-remove-btn-${detail.id}-${member.userId}`}
                    type="button"
                    className={buttonClassName("danger")}
                    disabled={busyActionKey === `remove-${detail.id}-${member.userId}`}
                    onClick={() => onRemoveMember(detail.id, member.userId)}
                  >
                    {busyActionKey === `remove-${detail.id}-${member.userId}` ? familyMessages.removingMember : familyMessages.removeMember}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function InvitesPanel({
  busyActionKey,
  detail,
  directInvites,
  familyMessages,
  formatTimestamp,
  inviteLinks,
  inviteUsageType,
  latestInviteUrl,
  onCopyInviteUrl,
  onCreateInviteLink,
  onDeleteInviteLink,
  onRevokeDirectInvite,
  onUsageTypeChange,
}: {
  busyActionKey: string | null;
  detail: FamilyDetail;
  directInvites: FamilyDirectInvite[];
  familyMessages: FamilyMessages;
  formatTimestamp: (value: string) => string;
  inviteLinks: FamilyInviteLink[];
  inviteUsageType: InviteUsageType;
  latestInviteUrl: string | null;
  onCopyInviteUrl: (familyId: number) => void;
  onCreateInviteLink: (familyId: number) => void;
  onDeleteInviteLink: (familyId: number, inviteId: number) => void;
  onRevokeDirectInvite: (familyId: number, inviteId: number) => void;
  onUsageTypeChange: (familyId: number, usageType: InviteUsageType) => void;
}) {
  if (detail.currentUserRole !== "admin") {
    return (
      <section id={`manage-families-invites-readonly-${detail.id}`} className="space-y-2">
        <h2 id={`manage-families-invites-readonly-title-${detail.id}`} className="text-lg font-semibold">{familyMessages.inviteCodesTitle}</h2>
        <p id={`manage-families-invites-readonly-copy-${detail.id}`} className="text-sm text-[var(--color-text-muted)]">
          {familyMessages.familyDetailsEmpty}
        </p>
      </section>
    );
  }

  return (
    <section id={`manage-families-invites-panel-${detail.id}`} className="space-y-4">
      <div id={`manage-families-invites-header-${detail.id}`} className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`manage-families-invites-title-${detail.id}`} className="text-lg font-semibold">{familyMessages.inviteCodesTitle}</h2>
        <button
          id={`manage-families-invites-create-btn-${detail.id}`}
          type="button"
          className={buttonClassName("primary")}
          disabled={busyActionKey === `invite-create-${detail.id}`}
          onClick={() => onCreateInviteLink(detail.id)}
        >
          {busyActionKey === `invite-create-${detail.id}` ? familyMessages.generatingInviteLink : familyMessages.generateInviteLink}
        </button>
      </div>

      <fieldset id={`manage-families-invites-usage-fieldset-${detail.id}`} className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
        <legend id={`manage-families-invites-usage-legend-${detail.id}`} className="px-1 text-sm font-medium">
          {familyMessages.inviteUsageLegend}
        </legend>
        <div id={`manage-families-invites-usage-options-${detail.id}`} className="flex flex-wrap gap-3">
          <label id={`manage-families-invites-usage-single-label-${detail.id}`} htmlFor={`manage-families-invites-usage-single-input-${detail.id}`} className="flex items-center gap-2 text-sm">
            <input
              id={`manage-families-invites-usage-single-input-${detail.id}`}
              type="radio"
              name={`manage-invite-usage-type-${detail.id}`}
              value="single_use"
              checked={inviteUsageType === "single_use"}
              onChange={() => onUsageTypeChange(detail.id, "single_use")}
            />
            {familyMessages.inviteSingleUse}
          </label>
          <label id={`manage-families-invites-usage-multi-label-${detail.id}`} htmlFor={`manage-families-invites-usage-multi-input-${detail.id}`} className="flex items-center gap-2 text-sm">
            <input
              id={`manage-families-invites-usage-multi-input-${detail.id}`}
              type="radio"
              name={`manage-invite-usage-type-${detail.id}`}
              value="multi_use"
              checked={inviteUsageType === "multi_use"}
              onChange={() => onUsageTypeChange(detail.id, "multi_use")}
            />
            {familyMessages.inviteMultiUse}
          </label>
        </div>
      </fieldset>

      {latestInviteUrl ? (
        <div id={`manage-families-invites-latest-url-${detail.id}`} className="space-y-2">
          <label id={`manage-families-invites-latest-url-label-${detail.id}`} htmlFor={`manage-families-invites-latest-url-input-${detail.id}`} className="block text-sm font-medium">
            {familyMessages.latestInviteUrlLabel}
          </label>
          <div id={`manage-families-invites-latest-url-row-${detail.id}`} className="flex flex-wrap items-center gap-2">
            <input
              id={`manage-families-invites-latest-url-input-${detail.id}`}
              readOnly
              value={latestInviteUrl}
              className="input-base min-w-[220px] flex-1"
            />
            <button
              id={`manage-families-invites-copy-btn-${detail.id}`}
              type="button"
              className={buttonClassName("secondary")}
              onClick={() => onCopyInviteUrl(detail.id)}
            >
              {familyMessages.copyUrl}
            </button>
          </div>
          <p id={`manage-families-invites-latest-url-note-${detail.id}`} className="text-xs text-[var(--color-text-muted)]">
            {familyMessages.latestInviteUrlNote}
          </p>
        </div>
      ) : null}

      {inviteLinks.length === 0 ? (
        <p id={`manage-families-invites-empty-${detail.id}`} className="text-sm text-[var(--color-text-muted)]">{familyMessages.inviteLinksEmpty}</p>
      ) : (
        <ul id={`manage-families-invites-list-${detail.id}`} className="space-y-2">
          {inviteLinks.map((inviteLink) => (
            <li id={`manage-families-invites-item-${detail.id}-${inviteLink.id}`} key={inviteLink.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
              <div id={`manage-families-invites-item-copy-${detail.id}-${inviteLink.id}`} className="space-y-1">
                <p id={`manage-families-invites-item-state-${detail.id}-${inviteLink.id}`} className="text-xs uppercase tracking-wide text-[var(--color-primary)]">{inviteLink.state}</p>
                <p id={`manage-families-invites-item-created-${detail.id}-${inviteLink.id}`} className="text-sm text-[var(--color-text-muted)]">
                  {familyMessages.inviteCreatedLabel}: {formatTimestamp(inviteLink.createdAt)}
                </p>
                <p id={`manage-families-invites-item-usage-${detail.id}-${inviteLink.id}`} className="text-sm text-[var(--color-text-muted)]">
                  {familyMessages.inviteUsageLabel}: {inviteLink.usageType === "single_use" ? familyMessages.inviteSingleUse : familyMessages.inviteMultiUse}
                </p>
                <p id={`manage-families-invites-item-expires-${detail.id}-${inviteLink.id}`} className="text-sm text-[var(--color-text-muted)]">
                  {familyMessages.inviteExpiresLabel}: {formatTimestamp(inviteLink.expiresAt)}
                </p>
              </div>
              <button
                id={`manage-families-invites-item-delete-btn-${detail.id}-${inviteLink.id}`}
                type="button"
                className={buttonClassName("danger", "mt-3")}
                disabled={busyActionKey === `invite-delete-${detail.id}-${inviteLink.id}`}
                onClick={() => onDeleteInviteLink(detail.id, inviteLink.id)}
              >
                {busyActionKey === `invite-delete-${detail.id}-${inviteLink.id}` ? familyMessages.deletingInviteLink : familyMessages.deleteInviteLink}
              </button>
            </li>
          ))}
        </ul>
      )}

      <DirectInvitesList
        busyActionKey={busyActionKey}
        detail={detail}
        directInvites={directInvites}
        familyMessages={familyMessages}
        formatTimestamp={formatTimestamp}
        onRevokeDirectInvite={onRevokeDirectInvite}
      />
    </section>
  );
}

function DirectInvitesList({
  busyActionKey,
  detail,
  directInvites,
  familyMessages,
  formatTimestamp,
  onRevokeDirectInvite,
}: {
  busyActionKey: string | null;
  detail: FamilyDetail;
  directInvites: FamilyDirectInvite[];
  familyMessages: FamilyMessages;
  formatTimestamp: (value: string) => string;
  onRevokeDirectInvite: (familyId: number, inviteId: number) => void;
}) {
  const rows = buildDirectInviteAdminRows(
    directInvites.map((invite) => ({
      id: invite.id,
      state: invite.state,
      targetUsername: invite.targetUsername,
      createdAtLabel: formatTimestamp(invite.createdAt),
      expiresAtLabel: formatTimestamp(invite.expiresAt),
    })),
  );

  return (
    <section id={`manage-families-direct-invites-panel-${detail.id}`} className="space-y-2">
      <h3 id={`manage-families-direct-invites-title-${detail.id}`} className="text-base font-semibold">
        {familyMessages.directInvitesTitle}
      </h3>
      {rows.length === 0 ? (
        <p id={`manage-families-direct-invites-empty-${detail.id}`} className="text-sm text-[var(--color-text-muted)]">
          {familyMessages.directInvitesEmpty}
        </p>
      ) : (
        <ul id={`manage-families-direct-invites-list-${detail.id}`} className="space-y-2">
          {rows.map((invite) => (
            <li id={`manage-families-direct-invites-item-${detail.id}-${invite.id}`} key={invite.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
              <div id={`manage-families-direct-invites-copy-${detail.id}-${invite.id}`} className="space-y-1">
                <p id={`manage-families-direct-invites-target-${detail.id}-${invite.id}`} className="text-sm font-medium">{invite.targetLabel}</p>
                <p id={`manage-families-direct-invites-state-${detail.id}-${invite.id}`} className="text-xs uppercase tracking-wide text-[var(--color-primary)]">{invite.stateLabel}</p>
                <p id={`manage-families-direct-invites-created-${detail.id}-${invite.id}`} className="text-sm text-[var(--color-text-muted)]">
                  {familyMessages.inviteCreatedLabel}: {invite.createdAtLabel}
                </p>
                <p id={`manage-families-direct-invites-expires-${detail.id}-${invite.id}`} className="text-sm text-[var(--color-text-muted)]">
                  {familyMessages.inviteExpiresLabel}: {invite.expiresAtLabel}
                </p>
              </div>
              <button
                id={`manage-families-direct-invites-revoke-btn-${detail.id}-${invite.id}`}
                type="button"
                className={buttonClassName("danger", "mt-3")}
                disabled={!invite.canRevoke || busyActionKey === `direct-invite-revoke-${detail.id}-${invite.id}`}
                onClick={() => onRevokeDirectInvite(detail.id, invite.id)}
              >
                {busyActionKey === `direct-invite-revoke-${detail.id}-${invite.id}` ? familyMessages.revokingDirectInvite : familyMessages.revokeDirectInvite}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SafetyPanel({
  busyActionKey,
  cooldownUntil,
  deletionRequest,
  detail,
  familyMessages,
  formatTimestamp,
  onCancelDeletionRequest,
  onInitiateDeletionRequest,
  onVoteDeletionRequest,
}: {
  busyActionKey: string | null;
  cooldownUntil: string | null;
  deletionRequest: DeletionRequest | null;
  detail: FamilyDetail;
  familyMessages: FamilyMessages;
  formatTimestamp: (value: string) => string;
  onCancelDeletionRequest: (familyId: number, requestId: number) => void;
  onInitiateDeletionRequest: (familyId: number) => void;
  onVoteDeletionRequest: (familyId: number, requestId: number, vote: "approve" | "deny") => void;
}) {
  const summary = buildDeletionWorkflowSummary({
    cooldownUntilLabel: cooldownUntil ? formatTimestamp(cooldownUntil) : null,
    currentUserId: detail.currentUserId,
    currentUserRole: detail.currentUserRole,
    request: deletionRequest
      ? {
          approveCount: deletionRequest.approveCount,
          denyCount: deletionRequest.denyCount,
          expiresAtLabel: formatTimestamp(deletionRequest.expiresAt),
          id: deletionRequest.id,
          initiatedByUserId: deletionRequest.initiatedByUserId,
          requiredApprovals: deletionRequest.requiredApprovals,
          votes: deletionRequest.votes,
        }
      : null,
  });

  return (
    <section id={`manage-families-safety-panel-${detail.id}`} className="space-y-3">
      <h2 id={`manage-families-safety-title-${detail.id}`} className="text-lg font-semibold">{familyMessages.deleteFamilyTitle}</h2>
      <p id={`manage-families-safety-status-${detail.id}`} className="text-sm text-[var(--color-text-muted)]">{summary.statusLabel}</p>
      {deletionRequest ? (
        <div id={`manage-families-safety-active-actions-${detail.id}`} className="flex flex-wrap gap-2">
          {summary.canApprove ? (
            <button
              id={`manage-families-safety-approve-btn-${detail.id}`}
              type="button"
              className={buttonClassName("primary")}
              disabled={busyActionKey === `delete-request-vote-approve-${detail.id}-${deletionRequest.id}`}
              onClick={() => onVoteDeletionRequest(detail.id, deletionRequest.id, "approve")}
            >
              {busyActionKey === `delete-request-vote-approve-${detail.id}-${deletionRequest.id}` ? familyMessages.submittingVote : familyMessages.approveDeletion}
            </button>
          ) : null}
          {summary.canDeny ? (
            <button
              id={`manage-families-safety-deny-btn-${detail.id}`}
              type="button"
              className={buttonClassName("secondary")}
              disabled={busyActionKey === `delete-request-vote-deny-${detail.id}-${deletionRequest.id}`}
              onClick={() => onVoteDeletionRequest(detail.id, deletionRequest.id, "deny")}
            >
              {busyActionKey === `delete-request-vote-deny-${detail.id}-${deletionRequest.id}` ? familyMessages.submittingVote : familyMessages.denyDeletion}
            </button>
          ) : null}
          {summary.canCancel ? (
            <button
              id={`manage-families-safety-cancel-btn-${detail.id}`}
              type="button"
              className={buttonClassName("secondary")}
              disabled={busyActionKey === `delete-request-cancel-${detail.id}-${deletionRequest.id}`}
              onClick={() => onCancelDeletionRequest(detail.id, deletionRequest.id)}
            >
              {busyActionKey === `delete-request-cancel-${detail.id}-${deletionRequest.id}` ? familyMessages.cancellingDeletion : familyMessages.cancelDeletionRequest}
            </button>
          ) : null}
        </div>
      ) : (
        <button
          id={`manage-families-safety-create-btn-${detail.id}`}
          type="button"
          className={buttonClassName("danger")}
          disabled={!summary.canRequestDeletion || busyActionKey === `delete-request-create-${detail.id}`}
          onClick={() => onInitiateDeletionRequest(detail.id)}
        >
          {busyActionKey === `delete-request-create-${detail.id}` ? familyMessages.creatingSubmit : familyMessages.requestFamilyDeletion}
        </button>
      )}
    </section>
  );
}

function FamilyPicture({
  family,
  familyMessages,
  idPrefix,
  size,
}: {
  family: Pick<Family, "name" | "pictureUrl">;
  familyMessages: FamilyMessages;
  idPrefix: string;
  size: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-24 w-24" : size === "md" ? "h-16 w-16" : "h-12 w-12";
  const imageSize = size === "lg" ? 96 : size === "md" ? 64 : 48;

  if (!family.pictureUrl) {
    return (
      <div id={`${idPrefix}-placeholder`} className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] text-xs text-[var(--color-text-muted)]`}>
        {familyMessages.pictureEmpty}
      </div>
    );
  }

  return (
    <Image
      id={idPrefix}
      src={family.pictureUrl}
      alt={family.name}
      className={`${sizeClass} shrink-0 rounded-[var(--radius-sm)] object-cover`}
      width={imageSize}
      height={imageSize}
    />
  );
}
