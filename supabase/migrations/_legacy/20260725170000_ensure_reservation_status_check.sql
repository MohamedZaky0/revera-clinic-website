-- 20260725170000_ensure_reservation_status_check.sql
--
-- Context: RISK-020. The POST /api/reservations handler carried a fallback chain that,
-- when an insert failed, silently rewrote status 'pending_deposit' to 'pending' and
-- dropped is_manual, created_by_employee_id, rooms and doctor_name — then reported
-- success. That crutch is being removed, so the schema it was papering over must be
-- correct first.
--
-- The most likely thing it was hiding is a reservations_status_check constraint that
-- predates 20260711204540_add_reservation_deposit_status.sql and therefore rejects
-- 'pending_deposit'. On such a database, every deposit-required website booking was
-- silently downgraded to a normal pending booking while the API still told the UI a
-- deposit was required.
--
-- This restates the constraint unconditionally so the database matches the eight
-- statuses the application actually uses, whichever earlier migrations did or did not run.
--
-- Idempotent: safe to re-run.

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN (
    'pending_deposit',
    'pending',
    'approved',
    'confirmed',
    'started',
    'completed',
    'cancelled',
    'rejected'
  ));

-- Period filtering for every finance rollup, and the approve-time conflict scans.
CREATE INDEX IF NOT EXISTS reservations_date_status_idx
  ON public.reservations (date, status);

CREATE INDEX IF NOT EXISTS reservations_branch_date_idx
  ON public.reservations (branch_id, date);
