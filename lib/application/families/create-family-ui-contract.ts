import type { CreateFamilyDraft } from "@/lib/application/families/create-family-workflow";
import type { Messages } from "@/lib/i18n/messages";

export type CreateFamilyMessages = Messages["family"]["createFamily"];

export type CreateFamilyInviteMethodTab = {
  id: "link" | "username";
  label: string;
};

export type CreateFamilyDetailsField = {
  id: "description" | "image" | "name";
  label: string;
};

export type CreateFamilyReviewSections = {
  invites: string[];
  profile: {
    description: string;
    image: string;
    name: string;
  };
  warning: {
    message: string;
    title: string;
  } | null;
};

export type CreateFamilyGeneratedInviteResult = {
  inviteId: string;
  inviteType: "direct" | "link";
  inviteUrl?: string;
  ok: boolean;
};

export type CreateFamilyGeneratedInviteLink = {
  id: string;
  inputId: string;
  label: string;
  url: string;
};

function formatMessage(template: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, value),
    template,
  );
}

export function getCreateFamilyStartCopy(messages: CreateFamilyMessages) {
  return {
    title: messages.startTitle,
    description: messages.startDescription,
    primaryActionLabel: messages.startPrimaryAction,
  };
}

export function getCreateFamilyDetailsFields(messages: CreateFamilyMessages): CreateFamilyDetailsField[] {
  return [
    { id: "name", label: messages.nameLabel },
    { id: "description", label: messages.descriptionLabel },
    { id: "image", label: messages.imageLabel },
  ];
}

export function getCreateFamilyInviteMethodTabs(messages: CreateFamilyMessages): CreateFamilyInviteMethodTab[] {
  return [
    { id: "link", label: messages.inviteLinkTab },
    { id: "username", label: messages.usernameInviteTab },
  ];
}

export function formatCreateFamilyInvite(
  invite: CreateFamilyDraft["stagedInvites"][number],
  messages: CreateFamilyMessages,
) {
  if (invite.kind === "link") {
    return invite.usageType === "single_use" ? messages.singleUseInviteSummary : messages.multiUseInviteSummary;
  }

  return formatMessage(messages.usernameInviteSummary, { username: invite.username });
}

export function buildCreateFamilyReviewSections(
  draft: CreateFamilyDraft,
  failedInviteMessages: string[],
  messages: CreateFamilyMessages,
): CreateFamilyReviewSections {
  return {
    profile: {
      name: draft.details.name.trim() || messages.notSet,
      description: draft.details.description.trim() || messages.noDescription,
      image: draft.stagedImage ? messages.imageStaged : messages.noImageStaged,
    },
    invites: draft.stagedInvites.map((invite) => formatCreateFamilyInvite(invite, messages)),
    warning:
      failedInviteMessages.length > 0
        ? {
            title: messages.recoverableWarningTitle,
            message: formatMessage(messages.recoverableWarningMessage, {
              messages: failedInviteMessages.join("; "),
            }),
          }
        : null,
  };
}

export function buildCreateFamilyGeneratedInviteLinks(
  inviteResults: CreateFamilyGeneratedInviteResult[],
  messages: CreateFamilyMessages,
): CreateFamilyGeneratedInviteLink[] {
  return inviteResults
    .filter((result): result is CreateFamilyGeneratedInviteResult & { inviteUrl: string } => result.ok && Boolean(result.inviteUrl))
    .map((result) => ({
      id: result.inviteId,
      inputId: `create-family-review-generated-invite-input-${result.inviteId}`,
      label: result.inviteType === "link" ? messages.inviteLinkTab : messages.usernameInviteTab,
      url: result.inviteUrl,
    }));
}
