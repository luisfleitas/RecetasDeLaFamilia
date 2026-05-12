ALTER TABLE "FamilyInvite" ADD COLUMN "invite_type" TEXT NOT NULL DEFAULT 'link';
ALTER TABLE "FamilyInvite" ADD COLUMN "target_user_id" INTEGER;

CREATE INDEX "FamilyInvite_family_id_invite_type_target_user_id_idx" ON "FamilyInvite"("family_id", "invite_type", "target_user_id");
CREATE INDEX "FamilyInvite_target_user_id_idx" ON "FamilyInvite"("target_user_id");
