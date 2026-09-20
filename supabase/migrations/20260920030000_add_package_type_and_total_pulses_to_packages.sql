-- 20260920030000_add_package_type_and_total_pulses_to_packages.sql
-- Adds package_type ('services' | 'pulses') and total_pulses columns to packages and customer_packages tables.

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS package_type text NOT NULL DEFAULT 'services';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'packages_package_type_check'
  ) THEN
    ALTER TABLE public.packages
      ADD CONSTRAINT packages_package_type_check
      CHECK (package_type IN ('services', 'pulses'));
  END IF;
END $$;

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS total_pulses integer NOT NULL DEFAULT 0;

ALTER TABLE public.customer_packages
  ADD COLUMN IF NOT EXISTS package_type text NOT NULL DEFAULT 'services';

ALTER TABLE public.customer_packages
  ADD COLUMN IF NOT EXISTS total_pulses integer NOT NULL DEFAULT 0;

ALTER TABLE public.customer_packages
  ADD COLUMN IF NOT EXISTS pulses_used integer NOT NULL DEFAULT 0;

ALTER TABLE public.customer_packages
  ADD COLUMN IF NOT EXISTS pulses_remaining integer NOT NULL DEFAULT 0;
