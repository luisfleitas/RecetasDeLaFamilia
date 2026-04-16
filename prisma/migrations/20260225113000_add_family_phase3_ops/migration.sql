-- Phase 3 observability and audit primitives.
CREATE TABLE "FamilyAuditEvent" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "event_type" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "actor_user_id" INTEGER,
  "family_id" INTEGER,
  "target_user_id" INTEGER,
  "invite_id" INTEGER,
  "old_role" TEXT,
  "new_role" TEXT,
  "metadata_json" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FamilyAuditEvent_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "FamilyAuditEvent_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "FamilyAuditEvent_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "FamilyInvite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "MetricEvent" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "metric_name" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "actor_user_id" INTEGER,
  "family_id" INTEGER,
  "invite_id" INTEGER,
  "status_code" INTEGER,
  "metadata_json" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetricEvent_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MetricEvent_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MetricEvent_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "FamilyInvite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "FamilyAuditEvent_family_id_created_at_idx" ON "FamilyAuditEvent"("family_id", "created_at");
CREATE INDEX "FamilyAuditEvent_event_type_created_at_idx" ON "FamilyAuditEvent"("event_type", "created_at");
CREATE INDEX "MetricEvent_metric_name_created_at_idx" ON "MetricEvent"("metric_name", "created_at");
CREATE INDEX "MetricEvent_created_at_idx" ON "MetricEvent"("created_at");
