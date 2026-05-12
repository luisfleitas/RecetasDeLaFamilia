import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildDeletionWorkflowSummary,
  buildDirectInviteAdminRows,
  buildLeaveFamilyPermission,
  buildManageWorkspaceViewModel,
  buildMemberActionPermissions,
  buildPendingInviteActionSummary,
  buildSelectedFamilyStepTabs,
  buildTopLevelManageTabs,
  resolveManageWorkspaceState,
} from "../lib/application/families/manage-family-workspace";

test("top-level manage tabs expose Option B labels and selected-family disabled state", () => {
  assert.deepEqual(
    buildTopLevelManageTabs({ activeTab: "families", hasSelectedFamily: false }),
    [
      { id: "families", label: "Families", isActive: true, isDisabled: false },
      { id: "pending-invites", label: "Pending invites", isActive: false, isDisabled: false },
      { id: "selected-family", label: "Selected family", isActive: false, isDisabled: true },
    ],
  );

  assert.deepEqual(
    buildTopLevelManageTabs({ activeTab: "selected-family", hasSelectedFamily: true }).at(-1),
    { id: "selected-family", label: "Selected family", isActive: true, isDisabled: false },
  );
});

test("workspace state preserves selected family while switching top-level tabs", () => {
  const state = resolveManageWorkspaceState({
    currentSelectedFamilyId: 42,
    nextTopTab: "pending-invites",
    nextSelectedFamilyId: undefined,
  });

  assert.equal(state.activeTopTab, "pending-invites");
  assert.equal(state.selectedFamilyId, 42);
  assert.equal(state.focusTarget, "top-tab");
});

test("selecting a family opens the selected-family tab and chooses the correct focus target", () => {
  assert.deepEqual(
    resolveManageWorkspaceState({
      currentSelectedFamilyId: null,
      nextTopTab: "families",
      nextSelectedFamilyId: 42,
      viewport: "desktop",
    }),
    {
      activeTopTab: "selected-family",
      selectedFamilyId: 42,
      focusTarget: "selected-family-workspace-heading",
    },
  );

  assert.equal(
    resolveManageWorkspaceState({
      currentSelectedFamilyId: null,
      nextTopTab: "families",
      nextSelectedFamilyId: 42,
      viewport: "mobile",
    }).focusTarget,
    "selected-family-summary",
  );
});

test("selected-family step tabs preserve selected step state", () => {
  assert.deepEqual(
    buildSelectedFamilyStepTabs({ activeStep: "members" }).map((tab) => [tab.id, tab.label, tab.isActive]),
    [
      ["overview", "Overview", false],
      ["members", "Members", true],
      ["invites", "Invites", false],
      ["safety", "Safety", false],
    ],
  );
});

test("workspace view model separates desktop two-zone and mobile list-first layouts", () => {
  const input = {
    families: [
      { id: 7, inviteCount: 1, memberCount: 3, name: "Sunday Dinner", pictureUrl: null, role: "admin" },
      { id: 9, inviteCount: 0, memberCount: 2, name: "Weeknight", pictureUrl: null, role: "member" },
    ],
    pendingInvites: [
      {
        expiresAtLabel: "May 12",
        familyName: "Cousins",
        id: 99,
        inviteType: "username",
        targetUsername: "luis",
      },
    ],
    selectedFamilyId: 7,
    viewport: "desktop" as const,
  };

  const desktop = buildManageWorkspaceViewModel(input);
  assert.equal(desktop.layout, "desktop-two-zone");
  assert.deepEqual(desktop.regionOrder, ["family-list", "selected-family-workspace"]);
  assert.equal(desktop.familyRows[0]?.name, "Sunday Dinner");
  assert.equal(desktop.pendingInviteRows[0]?.typeLabel, "Username invite for luis");
  assert.equal(desktop.selectedFamily?.id, 7);

  const mobile = buildManageWorkspaceViewModel({ ...input, viewport: "mobile" });
  assert.equal(mobile.layout, "mobile-list-first");
  assert.deepEqual(mobile.regionOrder, ["family-list", "pending-invites", "selected-family-summary", "selected-family-workspace"]);
});

test("pending invite summaries expose accept decline and undo actions", () => {
  assert.deepEqual(buildPendingInviteActionSummary({ decisionStatus: "pending", inviteState: "active" }), {
    primaryAction: "accept",
    secondaryAction: "decline",
    statusLabel: "Pending",
  });

  assert.deepEqual(buildPendingInviteActionSummary({ decisionStatus: "declined", inviteState: "active" }), {
    primaryAction: "undo-decline",
    secondaryAction: null,
    statusLabel: "Declined",
  });

  assert.deepEqual(buildPendingInviteActionSummary({ decisionStatus: "pending", inviteState: "expired" }), {
    primaryAction: null,
    secondaryAction: null,
    statusLabel: "Expired",
  });
});

test("direct invite admin rows expose target labels and revoke action state", () => {
  assert.deepEqual(
    buildDirectInviteAdminRows([
      {
        createdAtLabel: "May 11",
        expiresAtLabel: "May 18",
        id: 10,
        state: "active",
        targetUsername: "luis",
      },
      {
        createdAtLabel: "May 10",
        expiresAtLabel: "May 17",
        id: 11,
        state: "revoked",
        targetUsername: null,
      },
    ]),
    [
      {
        canRevoke: true,
        createdAtLabel: "May 11",
        expiresAtLabel: "May 18",
        id: 10,
        stateLabel: "Active",
        targetLabel: "Username invite for luis",
      },
      {
        canRevoke: false,
        createdAtLabel: "May 10",
        expiresAtLabel: "May 17",
        id: 11,
        stateLabel: "Revoked",
        targetLabel: "Username invite",
      },
    ],
  );
});

test("member action permissions prevent self-removal and member-only role changes", () => {
  assert.deepEqual(
    buildMemberActionPermissions({
      currentUserId: 1,
      currentUserRole: "admin",
      memberUserId: 2,
      memberRole: "member",
    }),
    { canPromote: true, canDemote: false, canRemove: true },
  );

  assert.deepEqual(
    buildMemberActionPermissions({
      currentUserId: 1,
      currentUserRole: "admin",
      memberUserId: 1,
      memberRole: "admin",
    }),
    { canPromote: false, canDemote: false, canRemove: false },
  );

  assert.deepEqual(
    buildMemberActionPermissions({
      currentUserId: 1,
      currentUserRole: "member",
      memberUserId: 2,
      memberRole: "member",
    }),
    { canPromote: false, canDemote: false, canRemove: false },
  );
});

test("leave-family permissions reflect last-admin and sole-member rules", () => {
  assert.deepEqual(
    buildLeaveFamilyPermission({ currentUserRole: "admin", adminCount: 1, memberCount: 3 }),
    { canLeave: false, requiresConfirmDelete: false, reason: "Last admin cannot leave while members remain" },
  );

  assert.deepEqual(
    buildLeaveFamilyPermission({ currentUserRole: "member", adminCount: 1, memberCount: 3 }),
    { canLeave: true, requiresConfirmDelete: false, reason: null },
  );

  assert.deepEqual(
    buildLeaveFamilyPermission({ currentUserRole: "admin", adminCount: 1, memberCount: 1 }),
    { canLeave: true, requiresConfirmDelete: true, reason: null },
  );
});

test("deletion workflow summary exposes vote and cancel permissions", () => {
  assert.deepEqual(
    buildDeletionWorkflowSummary({
      cooldownUntilLabel: null,
      currentUserId: 1,
      currentUserRole: "admin",
      request: null,
    }),
    {
      canApprove: false,
      canCancel: false,
      canDeny: false,
      canRequestDeletion: true,
      statusLabel: "No active deletion request",
    },
  );

  assert.deepEqual(
    buildDeletionWorkflowSummary({
      cooldownUntilLabel: null,
      currentUserId: 1,
      currentUserRole: "admin",
      request: {
        approveCount: 1,
        denyCount: 0,
        expiresAtLabel: "May 15",
        id: 10,
        initiatedByUserId: 1,
        requiredApprovals: 2,
        votes: [],
      },
    }),
    {
      canApprove: true,
      canCancel: true,
      canDeny: true,
      canRequestDeletion: false,
      statusLabel: "1/2 approvals, expires May 15",
    },
  );
});
