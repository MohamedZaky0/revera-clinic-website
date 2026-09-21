-- 20260921000000_add_laser_settlement_columns_to_reservations.sql
-- Persists the reservation's laser settlement mode, agreed per-pulse rate, and delivered pulse count.

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS laser_payment_mode text,
  ADD COLUMN IF NOT EXISTS laser_price_per_pulse numeric,
  ADD COLUMN IF NOT EXISTS delivered_pulses integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservations_laser_payment_mode_check'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_laser_payment_mode_check
      CHECK (laser_payment_mode IN ('SERVICE', 'PER_PULSE', 'PACKAGE'));
  END IF;
END $$;
