-- Adds two distinct outcomes:
-- 'no_show' — separate from 'cancelled' (RISK-029's deposit refund-vs-forfeit policy needs to
--   tell the two apart): cancelling in advance refunds the deposit to the patient's wallet; a
--   no-show forfeits it as a cancellation fee.
-- 'postponed' — the patient is still coming, just not on the original date. Unlike cancel/no_show
--   this is not a terminal outcome and moves no money: the deposit already paid stays exactly as
--   it is (amount_paid/amount_left untouched), only the status (and, via a normal date/time_slot
--   update, the schedule) changes.
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status = ANY (ARRAY[
    'pending_deposit'::text,
    'pending'::text,
    'approved'::text,
    'confirmed'::text,
    'started'::text,
    'completed'::text,
    'cancelled'::text,
    'rejected'::text,
    'no_show'::text,
    'postponed'::text
  ]));
