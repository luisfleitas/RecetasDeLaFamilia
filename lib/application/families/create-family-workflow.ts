import type { CreateFamilyInput, CreateFamilyInviteInput } from "@/lib/application/families/validation";

export type CreateFamilyDraftDetails = {
  description: string;
  name: string;
};

export type CreateFamilyDraftImage = {
  pictureUrl: string;
  storageKey: string;
};

export type CreateFamilyStagedLinkInvite = {
  id: string;
  kind: "link";
  usageType: CreateFamilyInviteInput["usageType"];
};

export type CreateFamilyStagedUsernameInvite = {
  id: string;
  kind: "username";
  username: string;
};

export type CreateFamilyStagedInvite =
  | CreateFamilyStagedLinkInvite
  | CreateFamilyStagedUsernameInvite;

export type CreateFamilyDraft = {
  details: CreateFamilyDraftDetails;
  nextInviteSequence: number;
  stagedImage: CreateFamilyDraftImage | null;
  stagedInvites: CreateFamilyStagedInvite[];
};

export type CreateFamilyReviewSummary = {
  blockers: string[];
  canCreate: boolean;
  hasImage: boolean;
  inviteCount: number;
  inviteCountLabel: string;
};

export type CreateFamilyInviteCompletionResult = {
  inviteId: string;
  message?: string;
  ok: boolean;
};

export type ResolveCreateFamilyCompletionInput = {
  familyId: number;
  imageAttached: boolean;
  inviteResults?: CreateFamilyInviteCompletionResult[];
};

export type CreateFamilyCompletion =
  | {
      failedInvites: [];
      familyId: number;
      nextDraft: CreateFamilyDraft;
      status: "success";
    }
  | {
      failedInvites: { inviteId: string; message: string }[];
      familyId: number;
      nextDraft: CreateFamilyDraft;
      status: "warning";
    };

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "";
}

function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

function nextInviteId(draft: CreateFamilyDraft) {
  return `invite-${draft.nextInviteSequence}`;
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function createInitialCreateFamilyDraft(): CreateFamilyDraft {
  return {
    details: {
      description: "",
      name: "",
    },
    nextInviteSequence: 1,
    stagedImage: null,
    stagedInvites: [],
  };
}

export function updateDetails(
  draft: CreateFamilyDraft,
  details: Partial<CreateFamilyDraftDetails>,
): CreateFamilyDraft {
  return {
    ...draft,
    details: {
      description:
        details.description === undefined ? draft.details.description : normalizeOptionalText(details.description),
      name: details.name === undefined ? draft.details.name : normalizeOptionalText(details.name),
    },
  };
}

export function stageImage(draft: CreateFamilyDraft, image: CreateFamilyDraftImage): CreateFamilyDraft {
  return {
    ...draft,
    stagedImage: {
      pictureUrl: image.pictureUrl,
      storageKey: image.storageKey,
    },
  };
}

export function stageInviteLink(
  draft: CreateFamilyDraft,
  invite: Pick<CreateFamilyStagedLinkInvite, "usageType">,
): CreateFamilyDraft {
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

export function stageUsernameInvite(
  draft: CreateFamilyDraft,
  invite: Pick<CreateFamilyStagedUsernameInvite, "username">,
): CreateFamilyDraft {
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

export function removeStagedInvite(draft: CreateFamilyDraft, inviteId: string): CreateFamilyDraft {
  return {
    ...draft,
    stagedInvites: draft.stagedInvites.filter((invite) => invite.id !== inviteId),
  };
}

export function buildCreateFamilyPayload(draft: CreateFamilyDraft): CreateFamilyInput {
  const description = draft.details.description.trim();

  return {
    name: draft.details.name.trim(),
    description: description.length > 0 ? description : null,
    pictureStorageKey: draft.stagedImage?.storageKey ?? null,
    stagedInvites: draft.stagedInvites.map((invite) => ({ ...invite })),
  };
}

export function summarizeCreateFamilyReview(draft: CreateFamilyDraft): CreateFamilyReviewSummary {
  const blockers: string[] = [];

  if (draft.details.name.trim().length === 0) {
    blockers.push("Family name is required");
  }

  return {
    blockers,
    canCreate: blockers.length === 0,
    hasImage: draft.stagedImage !== null,
    inviteCount: draft.stagedInvites.length,
    inviteCountLabel: pluralize(draft.stagedInvites.length, "staged invite", "staged invites"),
  };
}

export function resolveCreateFamilyCompletion(
  draft: CreateFamilyDraft,
  completion: ResolveCreateFamilyCompletionInput,
): CreateFamilyCompletion {
  const failedInvites = (completion.inviteResults ?? [])
    .filter((result) => !result.ok)
    .map((result) => ({
      inviteId: result.inviteId,
      message: result.message ?? "Invite could not be created",
    }));

  if (failedInvites.length > 0) {
    return {
      failedInvites,
      familyId: completion.familyId,
      nextDraft: draft,
      status: "warning",
    };
  }

  return {
    failedInvites: [],
    familyId: completion.familyId,
    nextDraft: createInitialCreateFamilyDraft(),
    status: "success",
  };
}
