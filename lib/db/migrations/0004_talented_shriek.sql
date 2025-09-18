-- Consolidated migration to align with existing journal entry 0004_talented_shriek
-- Adds s3_key columns (if missing) to reports and projects tables.
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "s3_key" text;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "s3_key" text;
