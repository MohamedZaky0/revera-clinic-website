-- ============================================================
-- Attendance & Activity Monitoring Schema Setup
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add coordinates to branches table
ALTER TABLE public.branches 
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

-- 2. Seed coordinates for branches
UPDATE public.branches 
  SET latitude = 30.001242, longitude = 31.451330 
  WHERE name_en = 'New Cairo Branch';

UPDATE public.branches 
  SET latitude = 30.066882, longitude = 30.933525 
  WHERE name_en = 'Sheikh Zayed Branch';

-- 3. Create HR Attendance Table
CREATE TABLE IF NOT EXISTS public.hr_attendance (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    uuid REFERENCES public.employee_accounts(id) ON DELETE CASCADE,
  date           date NOT NULL DEFAULT CURRENT_DATE,
  check_in_time  timestamptz DEFAULT now(),
  latitude       numeric,
  longitude      numeric,
  status         text NOT NULL DEFAULT 'Present', -- Present, Late, Out of Location
  created_at     timestamptz DEFAULT now(),
  UNIQUE (employee_id, date)
);

-- 4. Create HR Missing Alerts Table
CREATE TABLE IF NOT EXISTS public.hr_missing_alerts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    uuid REFERENCES public.employee_accounts(id) ON DELETE CASCADE,
  timestamp      timestamptz DEFAULT now(),
  resolved       boolean DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.hr_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_missing_alerts ENABLE ROW LEVEL SECURITY;

-- 6. Define Policies
DROP POLICY IF EXISTS "Allow public read access to hr_attendance" ON public.hr_attendance;
DROP POLICY IF EXISTS "Allow service_role full access to hr_attendance" ON public.hr_attendance;
DROP POLICY IF EXISTS "Allow public write access to hr_attendance" ON public.hr_attendance;

CREATE POLICY "Allow public read access to hr_attendance" ON public.hr_attendance FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access to hr_attendance" ON public.hr_attendance FOR ALL TO service_role USING (true);
CREATE POLICY "Allow public write access to hr_attendance" ON public.hr_attendance FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read access to hr_missing_alerts" ON public.hr_missing_alerts;
DROP POLICY IF EXISTS "Allow service_role full access to hr_missing_alerts" ON public.hr_missing_alerts;
DROP POLICY IF EXISTS "Allow public write access to hr_missing_alerts" ON public.hr_missing_alerts;

CREATE POLICY "Allow public read access to hr_missing_alerts" ON public.hr_missing_alerts FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access to hr_missing_alerts" ON public.hr_missing_alerts FOR ALL TO service_role USING (true);
CREATE POLICY "Allow public write access to hr_missing_alerts" ON public.hr_missing_alerts FOR ALL USING (true);
