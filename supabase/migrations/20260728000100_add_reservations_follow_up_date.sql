-- Supports the "postponed, don't know the new date yet" path: a reminder date for staff to
-- follow up, distinct from a real reschedule (which just updates date/time_slot directly and
-- needs no new column). Nullable and unused unless a booking is in the 'postponed' status.
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS follow_up_date date;
