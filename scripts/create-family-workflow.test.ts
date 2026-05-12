import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCreateFamilyPayload,
  createInitialCreateFamilyDraft,
  removeStagedInvite,
  resolveCreateFamilyCompletion,
  stageImage,
  stageInviteLink,
  stageUsernameInvite,
  summarizeCreateFamilyReview,
  updateDetails,
} from "../lib/application/families/create-family-workflow";

test("create family draft starts empty and trims details into the final create payload", () => {
  const draft = updateDetails(createInitialCreateFamilyDraft(), {
    name: "  Sunday Dinner  ",
    description: "  Shared recipes and planning  ",
  });

  assert.deepEqual(buildCreateFamilyPayload(draft), {
    name: "Sunday Dinner",
    description: "Shared recipes and planning",
    pictureStorageKey: null,
    stagedInvites: [],
  });

  assert.deepEqual(buildCreateFamilyPayload(updateDetails(draft, { description: "   " })), {
    name: "Sunday Dinner",
    description: null,
    pictureStorageKey: null,
    stagedInvites: [],
  });
});

test("staged image and invite choices are included in the final review payload", () => {
  const draft = stageUsernameInvite(
    stageInviteLink(
      stageImage(
        updateDetails(createInitialCreateFamilyDraft(), {
          name: "Brunch Crew",
          description: null,
        }),
        {
          storageKey: "family-images/staged/user-12/family_avatar.webp",
          pictureUrl: "/uploads/family-images/staged/user-12/family_avatar.webp",
        },
      ),
      { usageType: "multi_use" },
    ),
    { username: "  Alice.Sous  " },
  );

  assert.deepEqual(buildCreateFamilyPayload(draft), {
    name: "Brunch Crew",
    description: null,
    pictureStorageKey: "family-images/staged/user-12/family_avatar.webp",
    stagedInvites: [
      { id: "invite-1", kind: "link", usageType: "multi_use" },
      { id: "invite-2", kind: "username", username: "alice.sous" },
    ],
  });
  assert.deepEqual(draft.stagedInvites, [
    { id: "invite-1", kind: "link", usageType: "multi_use" },
    { id: "invite-2", kind: "username", username: "alice.sous" },
  ]);
});

test("review summary counts staged choices and warns when details are incomplete", () => {
  const emptySummary = summarizeCreateFamilyReview(createInitialCreateFamilyDraft());
  assert.equal(emptySummary.canCreate, false);
  assert.deepEqual(emptySummary.blockers, ["Family name is required"]);

  const readySummary = summarizeCreateFamilyReview(
    stageInviteLink(
      stageImage(updateDetails(createInitialCreateFamilyDraft(), { name: "Family Table" }), {
        storageKey: "family-images/staged/user-12/family_avatar.webp",
        pictureUrl: "/uploads/family-images/staged/user-12/family_avatar.webp",
      }),
      { usageType: "single_use" },
    ),
  );

  assert.equal(readySummary.canCreate, true);
  assert.equal(readySummary.hasImage, true);
  assert.equal(readySummary.inviteCountLabel, "1 staged invite");
});

test("staged invites can be removed without renumbering the remaining draft choices", () => {
  const draft = stageUsernameInvite(
    stageInviteLink(updateDetails(createInitialCreateFamilyDraft(), { name: "Family Table" }), {
      usageType: "single_use",
    }),
    { username: "maria" },
  );

  assert.deepEqual(removeStagedInvite(draft, "invite-1").stagedInvites, [
    { id: "invite-2", kind: "username", username: "maria" },
  ]);
});

test("completion records partial invite failures as a recoverable warning and resets cleanly after full success", () => {
  const draft = stageUsernameInvite(
    stageInviteLink(updateDetails(createInitialCreateFamilyDraft(), { name: "Family Table" }), {
      usageType: "single_use",
    }),
    { username: "maria" },
  );

  const partial = resolveCreateFamilyCompletion(draft, {
    familyId: 42,
    imageAttached: true,
    inviteResults: [
      { inviteId: "invite-1", ok: true },
      { inviteId: "invite-2", ok: false, message: "User already has a pending invite" },
    ],
  });

  assert.equal(partial.status, "warning");
  assert.equal(partial.familyId, 42);
  assert.deepEqual(partial.failedInvites, [
    { inviteId: "invite-2", message: "User already has a pending invite" },
  ]);

  const success = resolveCreateFamilyCompletion(draft, {
    familyId: 43,
    imageAttached: true,
    inviteResults: [
      { inviteId: "invite-1", ok: true },
      { inviteId: "invite-2", ok: true },
    ],
  });

  assert.equal(success.status, "success");
  assert.equal(success.nextDraft.details.name, "");
  assert.deepEqual(success.nextDraft.stagedInvites, []);
});
