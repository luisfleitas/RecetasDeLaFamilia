-- Change recipe visibility default from private to public (SQLite requires table rebuild).
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Recipe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "stepsMarkdown" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "created_by_user_id" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recipe_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Recipe" ("id", "title", "description", "stepsMarkdown", "visibility", "created_by_user_id", "createdAt", "updatedAt")
SELECT "id", "title", "description", "stepsMarkdown", "visibility", "created_by_user_id", "createdAt", "updatedAt"
FROM "Recipe";

DROP TABLE "Recipe";
ALTER TABLE "new_Recipe" RENAME TO "Recipe";

CREATE INDEX "Recipe_created_by_user_id_idx" ON "Recipe"("created_by_user_id");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
