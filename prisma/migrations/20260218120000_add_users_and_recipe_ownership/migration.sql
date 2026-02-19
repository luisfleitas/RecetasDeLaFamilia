-- Add users table and recipe ownership column.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- Backfill existing recipes with a legacy owner so the new NOT NULL FK can be applied safely.
INSERT INTO "users" ("first_name", "last_name", "email", "username", "password_hash")
VALUES ('Legacy', 'Owner', 'legacy-owner@example.local', 'legacy_owner', '$2b$12$7xvXj5qM4jW8wGY6fQMVauA4X52S7n6vQf8v8g2PydwQfI4x0HBrS');

CREATE TABLE "new_Recipe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "stepsMarkdown" TEXT NOT NULL,
    "created_by_user_id" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recipe_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Recipe" ("id", "title", "description", "stepsMarkdown", "created_by_user_id", "createdAt", "updatedAt")
SELECT "id", "title", "description", "stepsMarkdown", 1, "createdAt", "updatedAt"
FROM "Recipe";

DROP TABLE "Recipe";
ALTER TABLE "new_Recipe" RENAME TO "Recipe";

CREATE INDEX "Recipe_created_by_user_id_idx" ON "Recipe"("created_by_user_id");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
