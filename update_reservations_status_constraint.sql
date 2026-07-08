-- Revera Clinics — Update reservations status constraint
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/whmukkypceuizscpjcdo/sql/new

-- 1. Drop the old check constraint (typically reservations_status_check)
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;

-- 2. Create the updated check constraint with all lifecycle statuses
ALTER TABLE public.reservations ADD CONSTRAINT reservations_status_check 
  CHECK (status IN ('pending', 'approved', 'confirmed', 'started', 'completed', 'cancelled', 'rejected'));
