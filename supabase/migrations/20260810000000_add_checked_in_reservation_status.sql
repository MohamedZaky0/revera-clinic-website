-- Migration: Add 'checked_in' status to reservations_status_check constraint
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status = ANY (ARRAY[
    'pending_deposit'::text,
    'pending'::text,
    'approved'::text,
    'confirmed'::text,
    'checked_in'::text,
    'started'::text,
    'completed'::text,
    'cancelled'::text,
    'rejected'::text,
    'no_show'::text,
    'postponed'::text
  ]));
