-- Add missing s3_key column to projects (needed because schema.ts already references it)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "s3_key" text;
