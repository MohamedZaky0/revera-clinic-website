-- ============================================================
-- Add Target, Bonuses & Notes Tables
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add target columns to employee_accounts with validation constraints
ALTER TABLE public.employee_accounts 
ADD COLUMN IF NOT EXISTS required_target_amount numeric DEFAULT 0 CHECK (required_target_amount >= 0),
ADD COLUMN IF NOT EXISTS bonus_percentage numeric DEFAULT 0 CHECK (bonus_percentage >= 0 AND bonus_percentage <= 100);

-- 2. Add columns to reservations to track who created the booking
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS created_by_employee_id uuid REFERENCES public.employee_accounts(id) ON DELETE SET NULL;

-- 3. Add columns to hr_payroll to store targets and achieved revenue snapshots
ALTER TABLE public.hr_payroll
ADD COLUMN IF NOT EXISTS target_amount_snapshot numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_percentage_snapshot numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS achieved_revenue numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS calculated_bonus numeric DEFAULT 0;

-- 4. Create employee_notes table for administrative notes and reminders
CREATE TABLE IF NOT EXISTS public.employee_notes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    uuid REFERENCES public.employee_accounts(id) ON DELETE CASCADE,
  note           text NOT NULL,
  created_by     uuid REFERENCES public.employee_accounts(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Enable RLS for employee_notes
ALTER TABLE public.employee_notes ENABLE ROW LEVEL SECURITY;

-- Add policies for employee_notes
DROP POLICY IF EXISTS "Allow public read access to employee_notes" ON public.employee_notes;
DROP POLICY IF EXISTS "Allow service_role full access to employee_notes" ON public.employee_notes;
DROP POLICY IF EXISTS "Allow public write access to employee_notes" ON public.employee_notes;

CREATE POLICY "Allow public read access to employee_notes" ON public.employee_notes FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access to employee_notes" ON public.employee_notes FOR ALL TO service_role USING (true);
CREATE POLICY "Allow public write access to employee_notes" ON public.employee_notes FOR ALL USING (true);
