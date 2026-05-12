import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdminEditFamilySteps,
  getCreateFamilySteps,
  getManageFamilySelectedSteps,
  getManageFamilyTopTabs,
  getMemberViewFamilySteps,
  resolveNextFamilyStep,
} from "../lib/application/families/workflow-state";
import {
  buildFamilySummaryViewModel,
  buildPendingInviteSummaryViewModel,
} from "../lib/application/families/family-view-models";

test("create and admin edit family workflows use the approved four-step order", () => {
  assert.deepEqual(
    getCreateFamilySteps().map((step) => [step.id, step.label]),
    [
      ["start", "Start"],
      ["family-details", "Family details"],
      ["invite-members", "Invite members"],
      ["review", "Review"],
    ],
  );

  assert.deepEqual(
    getAdminEditFamilySteps().map((step) => [step.id, step.label]),
    [
      ["start", "Start"],
      ["family-details", "Family details"],
      ["invite-members", "Invite members"],
      ["review", "Review"],
    ],
  );
});

test("member view family workflow uses read-only details and invites steps", () => {
  assert.deepEqual(
    getMemberViewFamilySteps().map((step) => [step.id, step.label]),
    [
      ["details", "Details"],
      ["invites", "Invites"],
    ],
  );
});

test("manage family command workspace tabs use the approved order", () => {
  assert.deepEqual(
    getManageFamilyTopTabs().map((tab) => [tab.id, tab.label]),
    [
      ["families", "Families"],
      ["pending-invites", "Pending invites"],
      ["selected-family", "Selected family"],
    ],
  );

  assert.deepEqual(
    getManageFamilySelectedSteps().map((step) => [step.id, step.label]),
    [
      ["overview", "Overview"],
      ["members", "Members"],
      ["invites", "Invites"],
      ["safety", "Safety"],
    ],
  );
});

test("resolveNextFamilyStep returns the next step and stays at the final step", () => {
  assert.equal(resolveNextFamilyStep(getCreateFamilySteps(), "start"), "family-details");
  assert.equal(resolveNextFamilyStep(getCreateFamilySteps(), "family-details"), "invite-members");
  assert.equal(resolveNextFamilyStep(getCreateFamilySteps(), "invite-members"), "review");
  assert.equal(resolveNextFamilyStep(getCreateFamilySteps(), "review"), "review");
  assert.equal(resolveNextFamilyStep(getMemberViewFamilySteps(), "details"), "invites");
  assert.equal(resolveNextFamilyStep(getManageFamilySelectedSteps(), "unknown"), "overview");
});

test("family summary view models expose compact UI-safe family details", () => {
  assert.deepEqual(
    buildFamilySummaryViewModel({
      id: 20,
      name: "  Sunday Dinner  ",
      role: "admin",
      memberCount: 4,
      inviteCount: 2,
      pictureUrl: null,
    }),
    {
      id: 20,
      name: "Sunday Dinner",
      roleLabel: "Admin",
      memberCountLabel: "4 members",
      inviteCountLabel: "2 pending invites",
      pictureUrl: null,
    },
  );
});

test("pending invite summaries distinguish targeted username invites from reusable links", () => {
  assert.deepEqual(
    buildPendingInviteSummaryViewModel({
      id: 6,
      familyName: "Sunday Dinner",
      inviteType: "username",
      targetUsername: "alice",
      expiresAtLabel: "May 18",
    }),
    {
      id: 6,
      familyName: "Sunday Dinner",
      typeLabel: "Username invite for alice",
      expiresAtLabel: "May 18",
    },
  );

  assert.deepEqual(
    buildPendingInviteSummaryViewModel({
      id: 7,
      familyName: "Brunch",
      inviteType: "link",
      targetUsername: null,
      expiresAtLabel: null,
    }).typeLabel,
    "Invite link",
  );
});
