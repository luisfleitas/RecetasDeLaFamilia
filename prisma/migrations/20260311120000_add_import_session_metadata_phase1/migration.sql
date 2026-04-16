ALTER TABLE "ImportSession" ADD COLUMN "warnings_json" TEXT;
ALTER TABLE "ImportSession" ADD COLUMN "source_refs_json" TEXT;
ALTER TABLE "ImportSession" ADD COLUMN "provider_name" TEXT;
ALTER TABLE "ImportSession" ADD COLUMN "provider_model" TEXT;
ALTER TABLE "ImportSession" ADD COLUMN "prompt_version" TEXT;
