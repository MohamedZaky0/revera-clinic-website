-- PROPOSAL-002 Phase 5, task 5.1. Utilization ("booked_minutes / bottleneck_minutes") needs to
-- know exactly when a booking was approved, delivered, or left the pipeline without being
-- delivered -- none of that exists today, only `created_at`/`updated_at`. `no_show` and
-- `postponed` statuses already exist (20260728000000_add_no_show_and_postponed_reservation_status.sql),
-- so this migration only adds the three timestamp columns; the status CHECK constraint needs no
-- change.
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS approved_at   timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at  timestamptz;
