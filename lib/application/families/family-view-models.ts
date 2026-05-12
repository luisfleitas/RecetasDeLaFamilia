type FamilyRole = "admin" | "member" | string;
type PendingInviteType = "username" | "link" | "single-use-link" | string;

export type FamilySummaryInput = {
  id: number;
  inviteCount: number;
  memberCount: number;
  name: string;
  pictureUrl: string | null;
  role: FamilyRole;
};

export type FamilySummaryViewModel = {
  id: number;
  inviteCountLabel: string;
  memberCountLabel: string;
  name: string;
  pictureUrl: string | null;
  roleLabel: string;
};

export type PendingInviteSummaryInput = {
  expiresAtLabel: string | null;
  familyName: string;
  id: number;
  inviteType: PendingInviteType;
  targetUsername: string | null;
};

export type PendingInviteSummaryViewModel = {
  expiresAtLabel: string | null;
  familyName: string;
  id: number;
  typeLabel: string;
};

export type SelectedFamilyOverviewInput = {
  inviteCount: number;
  memberCount: number;
  name: string;
  role: FamilyRole;
};

export type SelectedFamilyOverviewViewModel = {
  headline: string;
  meta: string;
};

export type FamilyMemberRowInput = {
  displayName: string;
  id: number;
  role: FamilyRole;
  username: string;
};

export type FamilyMemberRowViewModel = {
  id: number;
  nameLabel: string;
  roleLabel: string;
};

export type FamilyInviteRowInput = {
  id: number;
  inviteType: PendingInviteType;
  targetUsername: string | null;
  tokenLabel: string;
};

export type FamilyInviteRowViewModel = {
  id: number;
  inviteLabel: string;
};

export type FamilySafetySummaryInput = {
  canDeleteFamily: boolean;
  canLeaveFamily: boolean;
  deletionRequestCount: number;
};

export type FamilySafetySummaryViewModel = {
  deletionLabel: string;
  leaveLabel: string;
};

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function roleLabel(role: FamilyRole) {
  return role === "admin" ? "Admin" : "Member";
}

function inviteTypeLabel(inviteType: PendingInviteType, targetUsername: string | null) {
  if (inviteType === "username" && targetUsername) {
    return `Username invite for ${targetUsername}`;
  }

  if (inviteType === "single-use-link") {
    return "Single-use invite link";
  }

  return "Invite link";
}

export function buildFamilySummaryViewModel(input: FamilySummaryInput): FamilySummaryViewModel {
  return {
    id: input.id,
    name: input.name.trim(),
    roleLabel: roleLabel(input.role),
    memberCountLabel: pluralize(input.memberCount, "member", "members"),
    inviteCountLabel: pluralize(input.inviteCount, "pending invite", "pending invites"),
    pictureUrl: input.pictureUrl,
  };
}

export function buildPendingInviteSummaryViewModel(
  input: PendingInviteSummaryInput,
): PendingInviteSummaryViewModel {
  return {
    id: input.id,
    familyName: input.familyName,
    typeLabel: inviteTypeLabel(input.inviteType, input.targetUsername),
    expiresAtLabel: input.expiresAtLabel,
  };
}

export function buildSelectedFamilyOverviewViewModel(
  input: SelectedFamilyOverviewInput,
): SelectedFamilyOverviewViewModel {
  return {
    headline: input.name.trim(),
    meta: `${roleLabel(input.role)} · ${pluralize(input.memberCount, "member", "members")} · ${pluralize(
      input.inviteCount,
      "pending invite",
      "pending invites",
    )}`,
  };
}

export function buildFamilyMemberRowViewModel(input: FamilyMemberRowInput): FamilyMemberRowViewModel {
  return {
    id: input.id,
    nameLabel: input.displayName.trim() || input.username,
    roleLabel: roleLabel(input.role),
  };
}

export function buildFamilyInviteRowViewModel(input: FamilyInviteRowInput): FamilyInviteRowViewModel {
  return {
    id: input.id,
    inviteLabel: `${inviteTypeLabel(input.inviteType, input.targetUsername)} · ${input.tokenLabel}`,
  };
}

export function buildFamilySafetySummaryViewModel(
  input: FamilySafetySummaryInput,
): FamilySafetySummaryViewModel {
  return {
    deletionLabel: input.canDeleteFamily
      ? pluralize(input.deletionRequestCount, "deletion request", "deletion requests")
      : "Deletion requires admin access",
    leaveLabel: input.canLeaveFamily ? "Leave family available" : "Leave family unavailable",
  };
}
