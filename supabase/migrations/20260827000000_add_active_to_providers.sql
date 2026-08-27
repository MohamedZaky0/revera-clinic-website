-- Add active status column to providers table
ALTER TABLE "public"."providers" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
