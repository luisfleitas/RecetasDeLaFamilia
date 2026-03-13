-- CreateTable
CREATE TABLE "ImportSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PARSED',
    "draft_json" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ImportSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ImportSession_user_id_created_at_idx" ON "ImportSession"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ImportSession_expires_at_idx" ON "ImportSession"("expires_at");
