-- ============================================================
-- Revera Clinics — Providers Table Expansion Migration
-- Run this in your Supabase SQL Editor to add new provider fields
-- ============================================================

ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS image text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('Male', 'Female'));
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS specialty text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS national_id text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS working_days_hours jsonb;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS start_date date;
