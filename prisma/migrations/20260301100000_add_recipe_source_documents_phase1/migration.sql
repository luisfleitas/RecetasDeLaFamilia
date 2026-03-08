-- CreateTable
CREATE TABLE "RecipeSourceDocument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "recipe_id" INTEGER,
    "import_session_id" TEXT,
    "uploaded_by_user_id" INTEGER NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "RecipeSourceDocument_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecipeSourceDocument_import_session_id_fkey" FOREIGN KEY ("import_session_id") REFERENCES "ImportSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecipeSourceDocument_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RecipeSourceDocument_recipe_id_created_at_idx" ON "RecipeSourceDocument"("recipe_id", "created_at");

-- CreateIndex
CREATE INDEX "RecipeSourceDocument_import_session_id_created_at_idx" ON "RecipeSourceDocument"("import_session_id", "created_at");

-- CreateIndex
CREATE INDEX "RecipeSourceDocument_uploaded_by_user_id_created_at_idx" ON "RecipeSourceDocument"("uploaded_by_user_id", "created_at");
