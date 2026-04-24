import assert from "node:assert/strict";
import { test } from "node:test";
import { messages } from "../lib/i18n/messages";

const requiredFamilyMessageKeys = [
  "createNameLabel",
  "createDescriptionLabel",
  "createPictureLabel",
  "createSubmit",
  "creatingSubmit",
  "listTitle",
  "listLoading",
  "listEmpty",
  "descriptionEmpty",
  "pictureEmpty",
  "hideDetails",
  "manageFamily",
  "viewMembers",
  "leaveFamily",
  "leavingFamily",
  "membersTab",
  "inviteCodesTab",
  "deletionTab",
  "membersTitle",
  "promotingMember",
  "promoteToAdmin",
  "removingMember",
  "removeMember",
  "inviteCodesTitle",
  "generateInviteLink",
  "generatingInviteLink",
  "inviteUsageLegend",
  "inviteSingleUse",
  "inviteMultiUse",
  "latestInviteUrlLabel",
  "copyUrl",
  "latestInviteUrlNote",
  "inviteLinksEmpty",
  "inviteCreatedLabel",
  "inviteUsageLabel",
  "inviteExpiresLabel",
  "revokingInvite",
  "revokeInvite",
  "deleteFamilyTitle",
  "deletionRequestPrefix",
  "deletionApprovalsSuffix",
  "deletionExpiresPrefix",
  "yourVote",
  "submittingVote",
  "approveDeletion",
  "denyDeletion",
  "cancellingDeletion",
  "cancelDeletionRequest",
  "deletionCooldownPrefix",
  "deletionCooldownSuffix",
  "requestFamilyDeletion",
  "familyDetailsLoading",
  "familyDetailsEmpty",
  "pendingInvitesTitle",
  "pendingInvitesLoading",
  "pendingInvitesEmpty",
  "pendingInviteDescriptionEmpty",
  "singleUseInviteCreated",
  "multiUseInviteCreated",
  "inviteLinkRevoked",
  "missingInviteUrl",
  "inviteUrlCopied",
  "errors",
] as const;

test("family dashboard has localized message coverage for english and spanish", () => {
  for (const locale of ["en", "es"] as const) {
    assert.ok("family" in messages[locale], `${locale} is missing family messages`);

    const familyMessages = messages[locale].family as Record<string, unknown>;
    for (const key of requiredFamilyMessageKeys) {
      assert.ok(key in familyMessages, `${locale}.family.${key} is missing`);
    }
  }
});
