-- Migration: 20260829000000_add_is_historical_to_reservations.sql
-- Description: Add is_historical boolean column to reservations table for tracking historical/previous bookings.

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS is_historical BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_reservations_is_historical ON reservations(is_historical);
