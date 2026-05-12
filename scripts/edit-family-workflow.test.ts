import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEditFamilyExistingInviteRows,
  buildEditFamilyPayload,
  buildEditFamilyReviewSummary,
  createInitialEditFamilyDraft,
  getEditFamilyModeCopy,
  isEditFamilyActionVisible,
  removeEditFamilyImage,
  stageEditFamilyImage,
  stageEditFamilyInviteLink,
  stageEditFamilyUsernameInvite,
  updateEditFamilyDetails,
} from "../lib/application/families/edit-family-workflow";

const family = {
  description: "Sunday dinners and holiday recipes",
  name: "Sunday Table",
  pictureStorageKey: "family-images/family-42/current.webp",
  pictureUrl: "/uploads/family-images/family-42/current.webp",
};

test("admin edit drafts start from the current family profile and build trimmed update payloads", () => {
  const draft = updateEditFamilyDetails(createInitialEditFamilyDraft(family), {
    name: "  Sunday Supper  ",
    description: "   ",
  });

  assert.deepEqual(buildEditFamilyPayload(draft), {
    name: "Sunday Supper",
    description: null,
    pictureStorageKey: "family-images/family-42/current.webp",
  });
});

test("image replace and remove actions are reflected in the save payload and review summary", () => {
  const replaced = stageEditFamilyImage(createInitialEditFamilyDraft(family), {
    pictureUrl: "/uploads/family-images/staged/user-12/replacement.webp",
    storageKey: "family-images/staged/user-12/replacement.webp",
  });
  assert.equal(buildEditFamilyPayload(replaced).pictureStorageKey, "family-images/staged/user-12/replacement.webp");
  assert.equal(buildEditFamilyReviewSummary(replaced).imageActionLabel, "Image will be replaced");

  const removed = removeEditFamilyImage(replaced);
  assert.equal(buildEditFamilyPayload(removed).pictureStorageKey, null);
  assert.equal(buildEditFamilyReviewSummary(removed).imageActionLabel, "Image will be removed");
});

test("admin edit can stage direct and link invites without mixing them into profile updates", () => {
  const draft = stageEditFamilyUsernameInvite(
    stageEditFamilyInviteLink(createInitialEditFamilyDraft(family), { usageType: "single_use" }),
    { username: "  @Marta  " },
  );

  assert.deepEqual(draft.stagedInvites, [
    { id: "invite-1", kind: "link", usageType: "single_use" },
    { id: "invite-2", kind: "username", username: "marta" },
  ]);
  assert.equal(buildEditFamilyReviewSummary(draft).inviteCountLabel, "2 staged invites");
  assert.deepEqual(buildEditFamilyPayload(draft), {
    name: "Sunday Table",
    description: "Sunday dinners and holiday recipes",
    pictureStorageKey: "family-images/family-42/current.webp",
  });
});

test("existing invite links are formatted for the edit invite-management list", () => {
  const rows = buildEditFamilyExistingInviteRows(
    [
      {
        id: 12,
        createdAt: "2026-05-10T12:00:00.000Z",
        expiresAt: "2026-05-17T12:00:00.000Z",
        state: "active",
        usageType: "single_use",
      },
      {
        id: 13,
        createdAt: "2026-05-09T12:00:00.000Z",
        expiresAt: "2026-05-16T12:00:00.000Z",
        state: "expired",
        usageType: "multi_use",
      },
    ],
    {
      activeLabel: "Active",
      createdLabel: "Created",
      expiresLabel: "Expires",
      multiUseLabel: "Multiple uses",
      singleUseLabel: "One-time use",
      usageLabel: "Usage",
    },
    (value) => `formatted:${value}`,
  );

  assert.deepEqual(rows, [
    {
      id: 12,
      createdLabel: "Created: formatted:2026-05-10T12:00:00.000Z",
      expiresLabel: "Expires: formatted:2026-05-17T12:00:00.000Z",
      stateLabel: "Active",
      usageLabel: "Usage: One-time use",
    },
    {
      id: 13,
      createdLabel: "Created: formatted:2026-05-09T12:00:00.000Z",
      expiresLabel: "Expires: formatted:2026-05-16T12:00:00.000Z",
      stateLabel: "expired",
      usageLabel: "Usage: Multiple uses",
    },
  ]);
});

test("member view mode uses read-only labels and hides edit/invite mutation actions", () => {
  assert.deepEqual(getEditFamilyModeCopy("view"), {
    shellTitle: "Family Details",
    wizardLabel: "Family details steps",
    primaryActionLabel: "View family details",
  });
  assert.equal(isEditFamilyActionVisible("view", "save-profile"), false);
  assert.equal(isEditFamilyActionVisible("view", "create-direct-invite"), false);
  assert.equal(isEditFamilyActionVisible("view", "revoke-invite"), false);
  assert.equal(isEditFamilyActionVisible("view", "view-invites"), true);
});

test("admin mode keeps Edit labels and mutation actions visible", () => {
  assert.deepEqual(getEditFamilyModeCopy("edit"), {
    shellTitle: "Edit Family",
    wizardLabel: "Edit family steps",
    primaryActionLabel: "Save family changes",
  });
  assert.equal(isEditFamilyActionVisible("edit", "save-profile"), true);
  assert.equal(isEditFamilyActionVisible("edit", "create-direct-invite"), true);
  assert.equal(isEditFamilyActionVisible("edit", "revoke-invite"), true);
});
