-- Add Family domain models for Phase 1 sharing foundation.
CREATE TABLE "Family" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "picture_storage_key" TEXT,
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Family_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "FamilyMembership" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "family_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilyMembership_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FamilyMembership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "FamilyInvite" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "family_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_by_user_id" INTEGER NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "revoked_at" DATETIME,
    "consumed_at" DATETIME,
    "consumed_by_user_id" INTEGER,
    "max_uses" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "FamilyInvite_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FamilyInvite_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FamilyInvite_consumed_by_user_id_fkey" FOREIGN KEY ("consumed_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "FamilyInviteDecision" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invite_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "first_opened_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_opened_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "FamilyInviteDecision_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "FamilyInvite" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FamilyInviteDecision_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Family_created_by_user_id_idx" ON "Family"("created_by_user_id");

CREATE UNIQUE INDEX "FamilyMembership_family_id_user_id_key" ON "FamilyMembership"("family_id", "user_id");
CREATE INDEX "FamilyMembership_user_id_idx" ON "FamilyMembership"("user_id");
CREATE INDEX "FamilyMembership_family_id_role_idx" ON "FamilyMembership"("family_id", "role");

CREATE UNIQUE INDEX "FamilyInvite_token_hash_key" ON "FamilyInvite"("token_hash");
CREATE INDEX "FamilyInvite_family_id_idx" ON "FamilyInvite"("family_id");
CREATE INDEX "FamilyInvite_family_id_expires_at_idx" ON "FamilyInvite"("family_id", "expires_at");

CREATE UNIQUE INDEX "FamilyInviteDecision_invite_id_user_id_key" ON "FamilyInviteDecision"("invite_id", "user_id");
CREATE INDEX "FamilyInviteDecision_user_id_status_idx" ON "FamilyInviteDecision"("user_id", "status");
