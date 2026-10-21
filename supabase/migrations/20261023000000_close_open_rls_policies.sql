-- 20261023000000_close_open_rls_policies.sql
--
-- RISK-128 (the residual risk RISK-019 left open, found while fixing RISK-126): close the old "allow all" policies that leave patient-adjacent,
-- salary and account tables readable -- and, for two of them, writable -- with the public browser
-- key (NEXT_PUBLIC_SUPABASE_ANON_KEY).
--
-- Measured on the test database on 2026-10-21 with the anon key: employee_accounts, hr_payroll,
-- hr_attendance, hr_leave_requests, hr_missing_alerts, hr_performance_reviews, prescriptions, roles,
-- inventory_devices, inventory_products, product_sales, device_maintenance_history and
-- terms_and_conditions all returned rows. The baseline also carries INSERT / UPDATE / DELETE policies
-- for employee_accounts and roles, i.e. the browser key could change or delete staff accounts and roles.
--
-- Every legitimate access goes through the API routes, which use the service role key and bypass RLS
-- (DEC-003), so nothing the application does through the API changes.
--
-- WHAT THIS DOES
--   1. Makes sure RLS is enabled on the tables below (a no-op where it already is).
--   2. Tables with NO browser-side reads -- every policy open to public / anon / authenticated is dropped,
--      leaving RLS on with no policy (deny-all for the browser key, like invoices / invoice_lines):
--        device_maintenance_history, employee_notes, hr_leave_requests, hr_missing_alerts, hr_payroll,
--        hr_performance_reviews, inventory_devices, inventory_products, prescriptions, product_sales,
--        roles, terms_and_conditions
--   3. employee_accounts and hr_attendance -- only the policies that allow INSERT / UPDATE / DELETE / ALL
--      are dropped; a public SELECT policy is kept (re-created if the only open policy was an ALL one).
--      They stay readable on purpose: UserProfileView.tsx and DoctorAccountView.tsx still read them
--      straight from the browser (the staff profile, attendance and the doctor-to-provider match).
--      Policies that are limited to the service_role role are never touched.
--
-- FOLLOW-UP (the app side is done: UserProfileView.tsx and DoctorAccountView.tsx now read through
--   /api/profile, /api/profile/attendance and /api/profile/payroll, RISK-128)
--   Once that code is deployed to the environment, close the last two read policies:
--     DROP POLICY IF EXISTS "Allow public read access to employee_accounts" ON public.employee_accounts;
--     DROP POLICY IF EXISTS "Allow public read access to hr_attendance"     ON public.hr_attendance;
--   Running them before the new code is live would blank the staff profile screen.
--
-- SIDE EFFECT: realtime events for prescriptions stop reaching the browser (they were only delivered
-- because of the open read policy). The Bookings screen already re-reads follow-ups every 15 s and on the
-- app's own prescription events (RISK-126), so nothing depends on them.
--
-- Additive in spirit and idempotent: it only drops policies and enables RLS; running it again changes
-- nothing. To roll back, re-create the policies from 20260726000000_dev_schema_baseline.sql (lines
-- ~971-1107) -- not recommended, they are the hole being closed.
--
-- Apply to every database (dev, production). Check afterwards with scripts/check-anon-access.mjs.

DO $$
DECLARE
  close_all  text[] := ARRAY[
    'device_maintenance_history', 'employee_notes', 'hr_leave_requests', 'hr_missing_alerts',
    'hr_payroll', 'hr_performance_reviews', 'inventory_devices', 'inventory_products',
    'prescriptions', 'product_sales', 'roles', 'terms_and_conditions'
  ];
  keep_read  text[] := ARRAY['employee_accounts', 'hr_attendance'];
  open_roles name[] := ARRAY['public', 'anon', 'authenticated']::name[];
  t          text;
  pol        record;
  had_open_read boolean;
BEGIN
  -- 1. RLS must be on, otherwise policies mean nothing and the table is open to everyone.
  FOREACH t IN ARRAY close_all || keep_read LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;

  -- 2. No browser reads: drop every open policy.
  FOREACH t IN ARRAY close_all LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      CONTINUE;
    END IF;
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND roles && open_roles
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;
  END LOOP;

  -- 3. Still read from the browser: keep reading, drop everything that writes.
  FOREACH t IN ARRAY keep_read LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND roles && open_roles AND cmd IN ('SELECT', 'ALL')
    ) INTO had_open_read;

    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND roles && open_roles AND cmd <> 'SELECT'
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;

    IF had_open_read AND NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND roles && open_roles AND cmd = 'SELECT'
    ) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', 'Allow public read access to ' || t, t);
    END IF;
  END LOOP;
END $$;
