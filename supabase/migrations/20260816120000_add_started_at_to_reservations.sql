-- RISK-043: a reservation could sit in status 'started' indefinitely because the transition
-- recorded no timestamp — a doctor was found with a session still open from six days earlier.
-- approved_at / completed_at / cancelled_at already exist; 'started' was the one transition
-- with no time anchor, so no staleness check could be built even in principle.
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- Backfill is deliberately NOT attempted: for sessions already in flight there is no record of
-- when they actually began, and inventing one would make a stale session look fresh.
