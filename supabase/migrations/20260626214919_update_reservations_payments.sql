-- Revera Clinics — Add payment fields to reservations table
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/whmukkypceuizscpjcdo/sql/new

ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS amount_left numeric;
