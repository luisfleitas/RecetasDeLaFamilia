BEGIN;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "auth_provider" TEXT NOT NULL DEFAULT 'local';

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "auth_provider_user_id" TEXT;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "profile_completed_at" TIMESTAMP(3);

ALTER TABLE "users"
ALTER COLUMN "password_hash" DROP NOT NULL;

UPDATE "users"
SET "auth_provider" = 'local'
WHERE "auth_provider" IS NULL;

UPDATE "users"
SET "profile_completed_at" = COALESCE("profile_completed_at", "created_at", CURRENT_TIMESTAMP)
WHERE "profile_completed_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_auth_provider_auth_provider_user_id_key"
ON "users" ("auth_provider", "auth_provider_user_id");

COMMIT;
