-- SQL migration to add is_manual column to reservations table
-- Run this in your Supabase SQL editor:

ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS is_manual boolean DEFAULT false;
