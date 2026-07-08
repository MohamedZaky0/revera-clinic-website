-- ============================================================
-- HR Systems Schema Setup
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create HR Payroll Table
CREATE TABLE IF NOT EXISTS public.hr_payroll (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    uuid REFERENCES public.employee_accounts(id) ON DELETE CASCADE,
  month          text NOT NULL, -- e.g. '2026-07'
  basic_salary   numeric DEFAULT 0,
  bonuses        numeric DEFAULT 0,
  deductions     numeric DEFAULT 0,
  net_salary     numeric DEFAULT 0,
  status         text NOT NULL DEFAULT 'Draft', -- Draft, Paid
  payment_date   timestamptz,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (employee_id, month)
);

-- 2. Create HR Leave Requests Table
CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    uuid REFERENCES public.employee_accounts(id) ON DELETE CASCADE,
  leave_type     text NOT NULL, -- Sick, Annual, Casual, Unpaid
  start_date     date NOT NULL,
  end_date       date NOT NULL,
  days_count     integer NOT NULL,
  reason         text,
  status         text NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected
  approved_by    uuid REFERENCES public.employee_accounts(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now()
);

-- 3. Create HR Performance Reviews Table
CREATE TABLE IF NOT EXISTS public.hr_performance_reviews (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    uuid REFERENCES public.employee_accounts(id) ON DELETE CASCADE,
  reviewer_id    uuid REFERENCES public.employee_accounts(id) ON DELETE SET NULL,
  review_date    date NOT NULL,
  rating         integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments       text,
  goals          text,
  created_at     timestamptz DEFAULT now()
);

-- 4. Enable RLS for all tables
ALTER TABLE public.hr_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_performance_reviews ENABLE ROW LEVEL SECURITY;

-- 5. Add Policies
-- Payroll Policies
DROP POLICY IF EXISTS "Allow public read access to hr_payroll" ON public.hr_payroll;
DROP POLICY IF EXISTS "Allow service_role full access to hr_payroll" ON public.hr_payroll;
DROP POLICY IF EXISTS "Allow public write access to hr_payroll" ON public.hr_payroll;

CREATE POLICY "Allow public read access to hr_payroll" ON public.hr_payroll FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access to hr_payroll" ON public.hr_payroll FOR ALL TO service_role USING (true);
CREATE POLICY "Allow public write access to hr_payroll" ON public.hr_payroll FOR ALL USING (true);

-- Leave Requests Policies
DROP POLICY IF EXISTS "Allow public read access to hr_leave_requests" ON public.hr_leave_requests;
DROP POLICY IF EXISTS "Allow service_role full access to hr_leave_requests" ON public.hr_leave_requests;
DROP POLICY IF EXISTS "Allow public write access to hr_leave_requests" ON public.hr_leave_requests;

CREATE POLICY "Allow public read access to hr_leave_requests" ON public.hr_leave_requests FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access to hr_leave_requests" ON public.hr_leave_requests FOR ALL TO service_role USING (true);
CREATE POLICY "Allow public write access to hr_leave_requests" ON public.hr_leave_requests FOR ALL USING (true);

-- Performance Reviews Policies
DROP POLICY IF EXISTS "Allow public read access to hr_performance_reviews" ON public.hr_performance_reviews;
DROP POLICY IF EXISTS "Allow service_role full access to hr_performance_reviews" ON public.hr_performance_reviews;
DROP POLICY IF EXISTS "Allow public write access to hr_performance_reviews" ON public.hr_performance_reviews;

CREATE POLICY "Allow public read access to hr_performance_reviews" ON public.hr_performance_reviews FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access to hr_performance_reviews" ON public.hr_performance_reviews FOR ALL TO service_role USING (true);
CREATE POLICY "Allow public write access to hr_performance_reviews" ON public.hr_performance_reviews FOR ALL USING (true);

-- 4. Create HR Attendance Table
CREATE TABLE IF NOT EXISTS public.hr_attendance (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    uuid REFERENCES public.employee_accounts(id) ON DELETE CASCADE,
  date           date NOT NULL,
  check_in_time  timestamptz DEFAULT now(),
  latitude       numeric,
  longitude      numeric,
  status         text NOT NULL DEFAULT 'Present', -- Present, Late, Absent
  created_at     timestamptz DEFAULT now(),
  UNIQUE (employee_id, date)
);

-- 5. Create HR Missing/Inactivity Alerts Table
CREATE TABLE IF NOT EXISTS public.hr_missing_alerts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    uuid REFERENCES public.employee_accounts(id) ON DELETE CASCADE,
  timestamp      timestamptz NOT NULL DEFAULT now(),
  resolved       boolean NOT NULL DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hr_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_missing_alerts ENABLE ROW LEVEL SECURITY;

-- Attendance Policies
DROP POLICY IF EXISTS "Allow public read access to hr_attendance" ON public.hr_attendance;
DROP POLICY IF EXISTS "Allow service_role full access to hr_attendance" ON public.hr_attendance;
DROP POLICY IF EXISTS "Allow public write access to hr_attendance" ON public.hr_attendance;

CREATE POLICY "Allow public read access to hr_attendance" ON public.hr_attendance FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access to hr_attendance" ON public.hr_attendance FOR ALL TO service_role USING (true);
CREATE POLICY "Allow public write access to hr_attendance" ON public.hr_attendance FOR ALL USING (true);

-- Missing Alerts Policies
DROP POLICY IF EXISTS "Allow public read access to hr_missing_alerts" ON public.hr_missing_alerts;
DROP POLICY IF EXISTS "Allow service_role full access to hr_missing_alerts" ON public.hr_missing_alerts;
DROP POLICY IF EXISTS "Allow public write access to hr_missing_alerts" ON public.hr_missing_alerts;

CREATE POLICY "Allow public read access to hr_missing_alerts" ON public.hr_missing_alerts FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access to hr_missing_alerts" ON public.hr_missing_alerts FOR ALL TO service_role USING (true);
CREATE POLICY "Allow public write access to hr_missing_alerts" ON public.hr_missing_alerts FOR ALL USING (true);
