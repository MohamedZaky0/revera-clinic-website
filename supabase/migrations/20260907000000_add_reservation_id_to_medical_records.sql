-- Migration: 20260907000000_add_reservation_id_to_medical_records.sql
-- Description: RISK-081 / CORRUPT-D03 - medical_records enforced UNIQUE(customer_id), so a second
-- visit's intake form silently overwrote the first visit's baseline data with no way to recover it.
-- Adds reservation_id so each visit gets its own row: the same visit's auto-saves keep updating one
-- row (same reservation_id), while a new visit (new reservation_id) creates a new row instead of
-- destroying the old one. Existing rows have no reservation_id and are left as-is - they keep
-- functioning as the "legacy single form per customer" rows they always were.

ALTER TABLE medical_records
  ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_medical_records_reservation_id ON medical_records(reservation_id);

ALTER TABLE medical_records
  DROP CONSTRAINT IF EXISTS medical_records_customer_id_key;

-- Postgres treats every NULL as distinct in a unique constraint, so existing reservation_id-less
-- rows (any number of them per customer) are unaffected; new rows with a reservation_id get exactly
-- one row per (customer, visit).
ALTER TABLE medical_records
  ADD CONSTRAINT medical_records_customer_id_reservation_id_key UNIQUE (customer_id, reservation_id);
