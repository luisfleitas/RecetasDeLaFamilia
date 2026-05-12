import type { CreateFamilyInviteInput, UpdateFamilyInput } from "@/lib/application/families/validation";

export type EditFamilyMode = "edit" | "view";

export type EditFamilyProfile = {
  description: string | null;
  name: string;
  pictureStorageKey: string | null;
  pictureUrl: string | null;
};

export type EditFamilyDraftImage = {
  pictureUrl: string;
  storageKey: string;
};

export type EditFamilyStagedLinkInvite = {
  id: string;
  kind: "link";
  usageType: CreateFamilyInviteInput["usageType"];
};

export type EditFamilyStagedUsernameInvite = {
  id: string;
  kind: "username";
  username: string;
};

export type EditFamilyStagedInvite =
  | EditFamilyStagedLinkInvite
  | EditFamilyStagedUsernameInvite;

export type EditFamilyDraft = {
  details: {
    description: string;
    name: string;
  };
  imageAction: "keep" | "replace" | "remove";
  initialProfile: EditFamilyProfile;
  nextInviteSequence: number;
  stagedImage: EditFamilyDraftImage | null;
  stagedInvites: EditFamilyStagedInvite[];
};

export type EditFamilyReviewSummary = {
  blockers: string[];
  canSave: boolean;
  hasProfileChanges: boolean;
  imageActionLabel: "Image unchanged" | "Image will be replaced" | "Image will be removed";
  inviteCount: number;
  inviteCountLabel: string;
};

export type EditFamilyExistingInviteLink = {
  createdAt: string;
  expiresAt: string;
  id: number;
  state: "active" | "revoked" | "consumed" | "expired";
  usageType: "single_use" | "multi_use";
};

export type EditFamilyExistingInviteRow = {
  createdLabel: string;
  expiresLabel: string;
  id: number;
  stateLabel: string;
  usageLabel: string;
};

export type EditFamilyExistingInviteRowMessages = {
  activeLabel: string;
  createdLabel: string;
  expiresLabel: string;
  multiUseLabel: string;
  singleUseLabel: string;
  usageLabel: string;
};

export type EditFamilyAction =
  | "create-direct-invite"
  | "create-link-invite"
  | "remove-image"
  | "replace-image"
  | "revoke-invite"
  | "save-profile"
  | "view-invites";

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "";
}

function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

function nextInviteId(draft: EditFamilyDraft) {
  return `invite-${draft.nextInviteSequence}`;
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function createInitialEditFamilyDraft(profile: EditFamilyProfile): EditFamilyDraft {
  return {
    details: {
      description: profile.description ?? "",
      name: profile.name,
    },
    imageAction: "keep",
    initialProfile: {
      description: profile.description,
      name: profile.name,
      pictureStorageKey: profile.pictureStorageKey,
      pictureUrl: profile.pictureUrl,
    },
    nextInviteSequence: 1,
    stagedImage: null,
    stagedInvites: [],
  };
}

export function updateEditFamilyDetails(
  draft: EditFamilyDraft,
  details: Partial<EditFamilyDraft["details"]>,
): EditFamilyDraft {
  return {
    ...draft,
    details: {
      description:
        details.description === undefined ? draft.details.description : normalizeOptionalText(details.description),
      name: details.name === undefined ? draft.details.name : normalizeOptionalText(details.name),
    },
  };
}

export function stageEditFamilyImage(draft: EditFamilyDraft, image: EditFamilyDraftImage): EditFamilyDraft {
  return {
    ...draft,
    imageAction: "replace",
    stagedImage: {
      pictureUrl: image.pictureUrl,
      storageKey: image.storageKey,
    },
  };
}

export function removeEditFamilyImage(draft: EditFamilyDraft): EditFamilyDraft {
  return {
    ...draft,
    imageAction: "remove",
    stagedImage: null,
  };
}

export function stageEditFamilyInviteLink(
  draft: EditFamilyDraft,
  invite: Pick<EditFamilyStagedLinkInvite, "usageType">,
): EditFamilyDraft {
  return {
    ...draft,
    nextInviteSequence: draft.nextInviteSequence + 1,
    stagedInvites: [
      ...draft.stagedInvites,
      {
        id: nextInviteId(draft),
        kind: "link",
        usageType: invite.usageType,
      },
    ],
  };
}

export function stageEditFamilyUsernameInvite(
  draft: EditFamilyDraft,
  invite: Pick<EditFamilyStagedUsernameInvite, "username">,
): EditFamilyDraft {
  return {
    ...draft,
    nextInviteSequence: draft.nextInviteSequence + 1,
    stagedInvites: [
      ...draft.stagedInvites,
      {
        id: nextInviteId(draft),
        kind: "username",
        username: normalizeUsername(invite.username),
      },
    ],
  };
}

export function removeEditFamilyStagedInvite(draft: EditFamilyDraft, inviteId: string): EditFamilyDraft {
  return {
    ...draft,
    stagedInvites: draft.stagedInvites.filter((invite) => invite.id !== inviteId),
  };
}

export function buildEditFamilyPayload(draft: EditFamilyDraft): UpdateFamilyInput {
  const description = draft.details.description.trim();
  let pictureStorageKey = draft.initialProfile.pictureStorageKey;

  if (draft.imageAction === "replace") {
    pictureStorageKey = draft.stagedImage?.storageKey ?? draft.initialProfile.pictureStorageKey;
  }

  if (draft.imageAction === "remove") {
    pictureStorageKey = null;
  }

  return {
    name: draft.details.name.trim(),
    description: description.length > 0 ? description : null,
    pictureStorageKey,
  };
}

export function buildEditFamilyReviewSummary(draft: EditFamilyDraft): EditFamilyReviewSummary {
  const payload = buildEditFamilyPayload(draft);
  const blockers: string[] = [];

  if (!payload.name || payload.name.length === 0) {
    blockers.push("Family name is required");
  }

  const imageActionLabel =
    draft.imageAction === "replace"
      ? "Image will be replaced"
      : draft.imageAction === "remove"
        ? "Image will be removed"
        : "Image unchanged";

  const hasProfileChanges =
    payload.name !== draft.initialProfile.name ||
    payload.description !== draft.initialProfile.description ||
    payload.pictureStorageKey !== draft.initialProfile.pictureStorageKey;

  return {
    blockers,
    canSave: blockers.length === 0,
    hasProfileChanges,
    imageActionLabel,
    inviteCount: draft.stagedInvites.length,
    inviteCountLabel: pluralize(draft.stagedInvites.length, "staged invite", "staged invites"),
  };
}

export function buildEditFamilyExistingInviteRows(
  invites: EditFamilyExistingInviteLink[],
  messages: EditFamilyExistingInviteRowMessages,
  formatTimestamp: (value: string) => string,
): EditFamilyExistingInviteRow[] {
  return invites.map((invite) => ({
    id: invite.id,
    createdLabel: `${messages.createdLabel}: ${formatTimestamp(invite.createdAt)}`,
    expiresLabel: `${messages.expiresLabel}: ${formatTimestamp(invite.expiresAt)}`,
    stateLabel: invite.state === "active" ? messages.activeLabel : invite.state,
    usageLabel: `${messages.usageLabel}: ${invite.usageType === "single_use" ? messages.singleUseLabel : messages.multiUseLabel}`,
  }));
}

export function getEditFamilyModeCopy(mode: EditFamilyMode) {
  if (mode === "view") {
    return {
      shellTitle: "Family Details",
      wizardLabel: "Family details steps",
      primaryActionLabel: "View family details",
    };
  }

  return {
    shellTitle: "Edit Family",
    wizardLabel: "Edit family steps",
    primaryActionLabel: "Save family changes",
  };
}

export function isEditFamilyActionVisible(mode: EditFamilyMode, action: EditFamilyAction) {
  if (mode === "edit") {
    return true;
  }

  return action === "view-invites";
}
