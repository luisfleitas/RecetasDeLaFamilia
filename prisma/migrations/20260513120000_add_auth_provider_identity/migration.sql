PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT,
    "auth_provider" TEXT NOT NULL DEFAULT 'local',
    "auth_provider_user_id" TEXT,
    "profile_completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_users" (
    "id",
    "first_name",
    "last_name",
    "email",
    "username",
    "password_hash",
    "auth_provider",
    "auth_provider_user_id",
    "profile_completed_at",
    "created_at"
)
SELECT
    "id",
    "first_name",
    "last_name",
    "email",
    "username",
    "password_hash",
    'local',
    NULL,
    COALESCE("created_at", CURRENT_TIMESTAMP),
    "created_at"
FROM "users";

DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_auth_provider_auth_provider_user_id_key"
ON "users"("auth_provider", "auth_provider_user_id");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
