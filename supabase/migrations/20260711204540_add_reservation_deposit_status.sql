-- Revera Clinics — Add pending_deposit status constraint
-- Run this in your Supabase SQL Editor:

-- 1. Drop the old check constraint (typically reservations_status_check)
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;

-- 2. Create the updated check constraint with all lifecycle statuses including pending_deposit
ALTER TABLE public.reservations ADD CONSTRAINT reservations_status_check 
  CHECK (status IN ('pending_deposit', 'pending', 'approved', 'confirmed', 'started', 'completed', 'cancelled', 'rejected'));
