-- Add admin-governed family deletion workflow primitives.
ALTER TABLE "Family" ADD COLUMN "deletion_cooldown_until" DATETIME;

CREATE TABLE "FamilyDeletionRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "family_id" INTEGER NOT NULL,
    "initiated_by_user_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "eligible_admin_count" INTEGER NOT NULL,
    "required_approvals" INTEGER NOT NULL,
    "eligible_admin_user_ids_json" TEXT NOT NULL,
    "approve_count" INTEGER NOT NULL DEFAULT 0,
    "deny_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" DATETIME NOT NULL,
    "resolved_at" DATETIME,
    "resolve_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "FamilyDeletionRequest_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FamilyDeletionRequest_initiated_by_user_id_fkey" FOREIGN KEY ("initiated_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "FamilyDeletionVote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deletion_request_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "vote" TEXT NOT NULL,
    "voted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilyDeletionVote_deletion_request_id_fkey" FOREIGN KEY ("deletion_request_id") REFERENCES "FamilyDeletionRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FamilyDeletionVote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "FamilyDeletionRequest_family_id_status_idx" ON "FamilyDeletionRequest"("family_id", "status");
CREATE INDEX "FamilyDeletionRequest_status_expires_at_idx" ON "FamilyDeletionRequest"("status", "expires_at");
CREATE UNIQUE INDEX "FamilyDeletionVote_deletion_request_id_user_id_key" ON "FamilyDeletionVote"("deletion_request_id", "user_id");
CREATE INDEX "FamilyDeletionVote_user_id_idx" ON "FamilyDeletionVote"("user_id");
