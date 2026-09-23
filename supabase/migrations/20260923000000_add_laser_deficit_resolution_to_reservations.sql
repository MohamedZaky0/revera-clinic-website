-- 20260923000000_add_laser_deficit_resolution_to_reservations.sql
--
-- Brief 35 / DEC-079: a queryable marker recording how a laser-pulse deficit on a
-- reservation was resolved at reception checkout ('BUY_NEW_PACKAGE' or
-- 'PAY_PER_PULSE'), and how many deficit pulses it covered. It is the
-- reservation-level idempotency key for POST /api/reservations/laser-deficit —
-- the package_pulse_usage unique index only protects the pulse consume, not the
-- invoice line or the package sale.
--
-- Nullable, no default: bookings without a deficit (or predating this column)
-- stay NULL. NOT APPLIED BY THE ASSISTANT — the owner applies migrations.

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS laser_deficit_resolution text,
  ADD COLUMN IF NOT EXISTS laser_deficit_pulses integer;

COMMENT ON COLUMN public.reservations.laser_deficit_resolution IS
  'How a delivered-pulses deficit was resolved at reception: BUY_NEW_PACKAGE or PAY_PER_PULSE. NULL = no deficit resolved (or none existed). Brief 35 / DEC-079.';
COMMENT ON COLUMN public.reservations.laser_deficit_pulses IS
  'Pulses delivered beyond the source package balance at resolution time. Paired with laser_deficit_resolution.';
