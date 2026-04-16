import assert from "node:assert/strict";
import { test } from "node:test";
import { FamilyDeletionRequestStatus } from "@prisma/client";
import {
  expireActiveDeletionRequests,
  getDeletionRequiredApprovals,
  isDeletionThresholdReached,
  isDeletionThresholdUnreachable,
  parseEligibleAdminUserIds,
  serializeEligibleAdminUserIds,
} from "../lib/families/deletion-requests";

type FakeRequestRecord = {
  id: number;
  familyId: number;
  status: FamilyDeletionRequestStatus;
  expiresAt: Date;
  resolvedAt: Date | null;
  resolveReason: string | null;
};

type FakeFamilyRecord = {
  id: number;
  deletionCooldownUntil: Date | null;
};

class FakeDeletionDb {
  public requests: FakeRequestRecord[] = [];
  public families: FakeFamilyRecord[] = [];

  familyDeletionRequest = {
    findMany: async (args: {
      where: {
        status: FamilyDeletionRequestStatus;
        expiresAt: { lte: Date };
        familyId?: number;
      };
      select: { id: true; familyId: true };
    }) => {
      return this.requests
        .filter((request) => request.status === args.where.status)
        .filter((request) => request.expiresAt <= args.where.expiresAt.lte)
        .filter((request) => (args.where.familyId ? request.familyId === args.where.familyId : true))
        .map((request) => ({ id: request.id, familyId: request.familyId }));
    },
    updateMany: async (args: {
      where: {
        id: number;
        status: FamilyDeletionRequestStatus;
      };
      data: {
        status: FamilyDeletionRequestStatus;
        resolvedAt: Date;
        resolveReason: string;
      };
    }) => {
      const target = this.requests.find((request) => request.id === args.where.id && request.status === args.where.status);
      if (!target) {
        return { count: 0 };
      }

      target.status = args.data.status;
      target.resolvedAt = args.data.resolvedAt;
      target.resolveReason = args.data.resolveReason;
      return { count: 1 };
    },
  };

  family = {
    findUnique: async (args: { where: { id: number }; select: { deletionCooldownUntil: true } }) => {
      const family = this.families.find((item) => item.id === args.where.id);
      if (!family) {
        return null;
      }

      return {
        deletionCooldownUntil: family.deletionCooldownUntil,
      };
    },
    update: async (args: { where: { id: number }; data: { deletionCooldownUntil: Date } }) => {
      const family = this.families.find((item) => item.id === args.where.id);
      if (!family) {
        throw new Error("family not found");
      }

      family.deletionCooldownUntil = args.data.deletionCooldownUntil;
      return {
        id: family.id,
        deletionCooldownUntil: family.deletionCooldownUntil,
      };
    },
  };
}

test("required approvals use 75% and round up", () => {
  assert.equal(getDeletionRequiredApprovals(1), 1);
  assert.equal(getDeletionRequiredApprovals(2), 2);
  assert.equal(getDeletionRequiredApprovals(3), 3);
  assert.equal(getDeletionRequiredApprovals(4), 3);
  assert.equal(getDeletionRequiredApprovals(5), 4);
});

test("threshold helpers reflect approval and unreachable logic", () => {
  assert.equal(isDeletionThresholdReached(3, 3), true);
  assert.equal(isDeletionThresholdReached(2, 3), false);

  assert.equal(
    isDeletionThresholdUnreachable({
      approveCount: 1,
      denyCount: 2,
      eligibleAdminCount: 4,
      requiredApprovals: 3,
    }),
    true,
  );

  assert.equal(
    isDeletionThresholdUnreachable({
      approveCount: 2,
      denyCount: 1,
      eligibleAdminCount: 4,
      requiredApprovals: 3,
    }),
    false,
  );
});

test("eligible admin serialization is stable and parsable", () => {
  const serialized = serializeEligibleAdminUserIds([9, 3, 3, 1]);
  assert.equal(serialized, "[1,3,9]");
  assert.deepEqual(parseEligibleAdminUserIds(serialized), [1, 3, 9]);
  assert.deepEqual(parseEligibleAdminUserIds("not-json"), []);
});

test("expiring active deletion requests marks requests expired and starts cooldown", async () => {
  const now = new Date();
  const db = new FakeDeletionDb();

  db.families.push({ id: 1, deletionCooldownUntil: null });
  db.families.push({ id: 2, deletionCooldownUntil: null });

  db.requests.push({
    id: 100,
    familyId: 1,
    status: FamilyDeletionRequestStatus.active,
    expiresAt: new Date(now.getTime() - 1_000),
    resolvedAt: null,
    resolveReason: null,
  });
  db.requests.push({
    id: 200,
    familyId: 2,
    status: FamilyDeletionRequestStatus.active,
    expiresAt: new Date(now.getTime() + 60_000),
    resolvedAt: null,
    resolveReason: null,
  });

  await expireActiveDeletionRequests(db as never, 1);

  const expired = db.requests.find((item) => item.id === 100);
  const stillActive = db.requests.find((item) => item.id === 200);

  assert.equal(expired?.status, FamilyDeletionRequestStatus.expired);
  assert.equal(expired?.resolveReason, "expired");
  assert.ok(expired?.resolvedAt instanceof Date);

  assert.equal(stillActive?.status, FamilyDeletionRequestStatus.active);
  assert.equal(stillActive?.resolveReason, null);

  const cooledFamily = db.families.find((item) => item.id === 1);
  const untouchedFamily = db.families.find((item) => item.id === 2);

  assert.ok(cooledFamily?.deletionCooldownUntil instanceof Date);
  assert.equal(untouchedFamily?.deletionCooldownUntil, null);
});
