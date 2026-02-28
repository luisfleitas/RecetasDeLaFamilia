-- Phase 2 recipe sharing model: visibility + recipe-family linkage.
ALTER TABLE "Recipe" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'private';

CREATE TABLE "RecipeFamilyLink" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "recipe_id" INTEGER NOT NULL,
  "family_id" INTEGER NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecipeFamilyLink_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecipeFamilyLink_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RecipeFamilyLink_recipe_id_family_id_key" ON "RecipeFamilyLink"("recipe_id", "family_id");
CREATE INDEX "RecipeFamilyLink_family_id_idx" ON "RecipeFamilyLink"("family_id");
