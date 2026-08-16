-- Store how long a session actually took once a doctor marks it completed, computed from
-- started_at -> completed_at. Distinct from services.duration_minutes (the planned/booked
-- duration) -- this is the real elapsed time for that specific reservation.
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS actual_duration_minutes integer;

-- Backfill is deliberately NOT attempted: reservations completed before started_at existed have
-- no reliable start time to compute a duration from.
