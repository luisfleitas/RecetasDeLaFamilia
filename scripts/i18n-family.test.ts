import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  "invitePageTitle",
  "inviteLoading",
  "inviteRetry",
  "inviteDescriptionEmpty",
  "inviteStateLabel",
  "inviteDecisionStatusLabel",
  "inviteAccept",
  "inviteDecline",
  "inviteUndoDecline",
  "inviteJoined",
  "inviteDeclined",
  "invitePending",
  "inviteAlreadyMember",
  "inviteStateActive",
  "inviteStateRevoked",
  "inviteStateConsumed",
  "inviteStateExpired",
  "inviteStateAlreadyMember",
  "inviteDecisionPending",
  "inviteDecisionDeclined",
  "inviteDecisionAccepted",
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

const requiredFamilyErrorKeys = [
  "loadInvite",
  "acceptInvite",
  "declineInvite",
  "undoDeclineInvite",
] as const;

test("family invite flow has localized error coverage for english and spanish", () => {
  for (const locale of ["en", "es"] as const) {
    const familyErrors = messages[locale].family.errors as Record<string, unknown>;

    for (const key of requiredFamilyErrorKeys) {
      assert.ok(key in familyErrors, `${locale}.family.errors.${key} is missing`);
    }
  }
});

const familyApiRouteFiles = [
  "app/api/families/route.ts",
  "app/api/families/[familyId]/route.ts",
  "app/api/families/[familyId]/leave/route.ts",
  "app/api/families/[familyId]/members/[userId]/route.ts",
  "app/api/families/[familyId]/invite-links/route.ts",
  "app/api/families/[familyId]/invite-links/[inviteId]/route.ts",
  "app/api/families/[familyId]/deletion-requests/route.ts",
  "app/api/families/[familyId]/deletion-requests/active/route.ts",
  "app/api/families/[familyId]/deletion-requests/[requestId]/approve/route.ts",
  "app/api/families/[familyId]/deletion-requests/[requestId]/cancel/route.ts",
  "app/api/families/[familyId]/deletion-requests/[requestId]/deny/route.ts",
  "app/api/family-invites/[token]/route.ts",
  "app/api/family-invites/[token]/accept/route.ts",
  "app/api/family-invites/[token]/decline/route.ts",
  "app/api/family-invites/[token]/undo-decline/route.ts",
] as const;

test("family api server errors include stable codes", () => {
  for (const routeFile of familyApiRouteFiles) {
    const source = readFileSync(routeFile, "utf8");
    assert.equal(
      source.includes("NextResponse.json({ error: message }, { status: 500 })"),
      false,
      `${routeFile} returns generic 500 errors without a stable code`
    );
  }
});
