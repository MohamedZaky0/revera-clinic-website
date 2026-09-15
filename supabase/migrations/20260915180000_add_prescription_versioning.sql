-- Migration: Add versioning and immutable history tracking to prescriptions table
-- Date: 2026-09-15
-- Description: Supports editing prescriptions without losing history by tracking version numbers,
-- root prescription IDs, parent prescription IDs, is_latest status flag, and responsible doctor attribution.

ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_latest boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS parent_prescription_id uuid REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS root_prescription_id uuid REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS doctor_name text,
  ADD COLUMN IF NOT EXISTS doctor_id uuid;

-- Backfill pre-existing rows to have root_prescription_id point to their own id
UPDATE public.prescriptions
SET
  root_prescription_id = id,
  version = 1,
  is_latest = true
WHERE root_prescription_id IS NULL;

-- Create indexes for fast lookup of version chains and latest prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_root_version ON public.prescriptions(root_prescription_id, version);
CREATE INDEX IF NOT EXISTS idx_prescriptions_customer_latest ON public.prescriptions(customer_id, is_latest);
CREATE INDEX IF NOT EXISTS idx_prescriptions_booking_latest ON public.prescriptions(booking_id, is_latest);
