import {
  buildFamilySummaryViewModel,
  buildPendingInviteSummaryViewModel,
  type FamilySummaryInput,
  type FamilySummaryViewModel,
  type PendingInviteSummaryInput,
  type PendingInviteSummaryViewModel,
} from "@/lib/application/families/family-view-models";
import {
  buildFamilyWorkflowStepViewModels,
  getManageFamilySelectedSteps,
  getManageFamilyTopTabs,
  type ManageFamilySelectedStep,
  type ManageFamilyTopTab,
} from "@/lib/application/families/workflow-state";

type FamilyRole = "admin" | "member" | string;
type ViewportMode = "desktop" | "mobile";

export type ManageTabViewModel = {
  id: ManageFamilyTopTab;
  isActive: boolean;
  isDisabled: boolean;
  label: string;
};

export type SelectedFamilyStepTabViewModel = {
  id: ManageFamilySelectedStep;
  isActive: boolean;
  label: string;
};

export type ManageWorkspaceFocusTarget =
  | "selected-family-summary"
  | "selected-family-workspace-heading"
  | "top-tab";

export type ManageWorkspaceState = {
  activeTopTab: ManageFamilyTopTab;
  focusTarget: ManageWorkspaceFocusTarget;
  selectedFamilyId: number | null;
};

export type ManageWorkspaceLayout = "desktop-two-zone" | "mobile-list-first";

export type ManageWorkspaceRegion =
  | "family-list"
  | "pending-invites"
  | "selected-family-summary"
  | "selected-family-workspace";

export type ManageWorkspaceViewModel = {
  familyRows: FamilySummaryViewModel[];
  layout: ManageWorkspaceLayout;
  pendingInviteRows: PendingInviteSummaryViewModel[];
  regionOrder: ManageWorkspaceRegion[];
  selectedFamily: FamilySummaryViewModel | null;
};

export type PendingInviteActionSummary = {
  primaryAction: "accept" | "undo-decline" | null;
  secondaryAction: "decline" | null;
  statusLabel: string;
};

export type DirectInviteAdminInput = {
  createdAtLabel: string;
  expiresAtLabel: string;
  id: number;
  state: "active" | "consumed" | "expired" | "revoked" | string;
  targetUsername: string | null;
};

export type DirectInviteAdminRow = {
  canRevoke: boolean;
  createdAtLabel: string;
  expiresAtLabel: string;
  id: number;
  stateLabel: string;
  targetLabel: string;
};

export type MemberActionPermissions = {
  canDemote: boolean;
  canPromote: boolean;
  canRemove: boolean;
};

export type LeaveFamilyPermission = {
  canLeave: boolean;
  reason: string | null;
  requiresConfirmDelete: boolean;
};

export type DeletionWorkflowRequestInput = {
  approveCount: number;
  denyCount: number;
  expiresAtLabel: string;
  id: number;
  initiatedByUserId: number;
  requiredApprovals: number;
  votes: { userId: number; vote: "approve" | "deny" }[];
};

export type DeletionWorkflowSummary = {
  canApprove: boolean;
  canCancel: boolean;
  canDeny: boolean;
  canRequestDeletion: boolean;
  statusLabel: string;
};

function clampTopTab(tab: ManageFamilyTopTab, hasSelectedFamily: boolean): ManageFamilyTopTab {
  if (tab === "selected-family" && !hasSelectedFamily) {
    return "families";
  }

  return tab;
}

function labelFromStatus(value: string) {
  return value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function buildTopLevelManageTabs({
  activeTab,
  hasSelectedFamily,
}: {
  activeTab: ManageFamilyTopTab;
  hasSelectedFamily: boolean;
}): ManageTabViewModel[] {
  const safeActiveTab = clampTopTab(activeTab, hasSelectedFamily);

  return getManageFamilyTopTabs().map((tab) => ({
    id: tab.id,
    label: tab.label,
    isActive: tab.id === safeActiveTab,
    isDisabled: tab.id === "selected-family" && !hasSelectedFamily,
  }));
}

export function resolveManageWorkspaceState({
  currentSelectedFamilyId,
  nextTopTab,
  nextSelectedFamilyId,
  viewport = "desktop",
}: {
  currentSelectedFamilyId: number | null;
  nextTopTab: ManageFamilyTopTab;
  nextSelectedFamilyId?: number;
  viewport?: ViewportMode;
}): ManageWorkspaceState {
  const selectedFamilyId = nextSelectedFamilyId ?? currentSelectedFamilyId;
  const activeTopTab = nextSelectedFamilyId
    ? "selected-family"
    : clampTopTab(nextTopTab, selectedFamilyId !== null);
  const focusTarget = nextSelectedFamilyId
    ? viewport === "mobile"
      ? "selected-family-summary"
      : "selected-family-workspace-heading"
    : "top-tab";

  return {
    activeTopTab,
    selectedFamilyId,
    focusTarget,
  };
}

export function buildSelectedFamilyStepTabs({
  activeStep,
}: {
  activeStep: ManageFamilySelectedStep;
}): SelectedFamilyStepTabViewModel[] {
  return buildFamilyWorkflowStepViewModels({
    steps: getManageFamilySelectedSteps(),
    activeStep,
  }).map((step) => ({
    id: step.id,
    label: step.label,
    isActive: step.status === "current",
  }));
}

export function buildManageWorkspaceViewModel({
  families,
  pendingInvites,
  selectedFamilyId,
  viewport,
}: {
  families: FamilySummaryInput[];
  pendingInvites: PendingInviteSummaryInput[];
  selectedFamilyId: number | null;
  viewport: ViewportMode;
}): ManageWorkspaceViewModel {
  const familyRows = families.map(buildFamilySummaryViewModel);
  const pendingInviteRows = pendingInvites.map(buildPendingInviteSummaryViewModel);
  const selectedFamily = familyRows.find((family) => family.id === selectedFamilyId) ?? null;

  return {
    familyRows,
    pendingInviteRows,
    selectedFamily,
    layout: viewport === "desktop" ? "desktop-two-zone" : "mobile-list-first",
    regionOrder:
      viewport === "desktop"
        ? ["family-list", "selected-family-workspace"]
        : ["family-list", "pending-invites", "selected-family-summary", "selected-family-workspace"],
  };
}

export function buildPendingInviteActionSummary({
  decisionStatus,
  inviteState,
}: {
  decisionStatus: "accepted" | "declined" | "pending" | string;
  inviteState: "active" | "consumed" | "expired" | "revoked" | string;
}): PendingInviteActionSummary {
  if (inviteState !== "active") {
    return {
      primaryAction: null,
      secondaryAction: null,
      statusLabel: labelFromStatus(inviteState),
    };
  }

  if (decisionStatus === "declined") {
    return {
      primaryAction: "undo-decline",
      secondaryAction: null,
      statusLabel: "Declined",
    };
  }

  if (decisionStatus === "pending") {
    return {
      primaryAction: "accept",
      secondaryAction: "decline",
      statusLabel: "Pending",
    };
  }

  return {
    primaryAction: null,
    secondaryAction: null,
    statusLabel: labelFromStatus(decisionStatus),
  };
}

export function buildDirectInviteAdminRows(invites: DirectInviteAdminInput[]): DirectInviteAdminRow[] {
  return invites.map((invite) => ({
    id: invite.id,
    canRevoke: invite.state === "active",
    createdAtLabel: invite.createdAtLabel,
    expiresAtLabel: invite.expiresAtLabel,
    stateLabel: labelFromStatus(invite.state),
    targetLabel: invite.targetUsername ? `Username invite for ${invite.targetUsername}` : "Username invite",
  }));
}

export function buildMemberActionPermissions({
  currentUserId,
  currentUserRole,
  memberUserId,
  memberRole,
}: {
  currentUserId: number;
  currentUserRole: FamilyRole;
  memberUserId: number;
  memberRole: FamilyRole;
}): MemberActionPermissions {
  const isAdmin = currentUserRole === "admin";
  const isSelf = currentUserId === memberUserId;

  return {
    canPromote: isAdmin && !isSelf && memberRole !== "admin",
    canDemote: isAdmin && !isSelf && memberRole === "admin",
    canRemove: isAdmin && !isSelf,
  };
}

export function buildLeaveFamilyPermission({
  currentUserRole,
  adminCount,
  memberCount,
}: {
  adminCount: number;
  currentUserRole: FamilyRole;
  memberCount: number;
}): LeaveFamilyPermission {
  if (memberCount <= 1) {
    return {
      canLeave: true,
      requiresConfirmDelete: true,
      reason: null,
    };
  }

  if (currentUserRole === "admin" && adminCount <= 1) {
    return {
      canLeave: false,
      requiresConfirmDelete: false,
      reason: "Last admin cannot leave while members remain",
    };
  }

  return {
    canLeave: true,
    requiresConfirmDelete: false,
    reason: null,
  };
}

export function buildDeletionWorkflowSummary({
  cooldownUntilLabel,
  currentUserId,
  currentUserRole,
  request,
}: {
  cooldownUntilLabel: string | null;
  currentUserId: number;
  currentUserRole: FamilyRole;
  request: DeletionWorkflowRequestInput | null;
}): DeletionWorkflowSummary {
  const isAdmin = currentUserRole === "admin";

  if (!request) {
    return {
      canApprove: false,
      canCancel: false,
      canDeny: false,
      canRequestDeletion: isAdmin && !cooldownUntilLabel,
      statusLabel: cooldownUntilLabel ? `Deletion cooldown until ${cooldownUntilLabel}` : "No active deletion request",
    };
  }

  const hasVoted = request.votes.some((vote) => vote.userId === currentUserId);
  const canVote = isAdmin && !hasVoted;

  return {
    canApprove: canVote,
    canCancel: isAdmin && request.initiatedByUserId === currentUserId,
    canDeny: canVote,
    canRequestDeletion: false,
    statusLabel: `${request.approveCount}/${request.requiredApprovals} approvals, expires ${request.expiresAtLabel}`,
  };
}
