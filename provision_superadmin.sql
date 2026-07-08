-- ============================================================
-- Revera Clinics — Database Setup and Superadmin Linking
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/whmukkypceuizscpjcdo/sql/new
-- ============================================================

-- 1. Create Roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL,
  permissions text[] NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Enable RLS for roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to avoid duplicate errors
DROP POLICY IF EXISTS "Allow public read access to roles" ON public.roles;
DROP POLICY IF EXISTS "Allow service_role full access to roles" ON public.roles;
DROP POLICY IF EXISTS "Allow public insert to roles" ON public.roles;
DROP POLICY IF EXISTS "Allow public update to roles" ON public.roles;
DROP POLICY IF EXISTS "Allow public delete to roles" ON public.roles;

-- Allow read access to roles
CREATE POLICY "Allow public read access to roles" ON public.roles
  FOR SELECT USING (true);

-- Allow all operations to service_role key
CREATE POLICY "Allow service_role full access to roles" ON public.roles
  FOR ALL TO service_role USING (true);

-- Allow insert, update, delete for server API routes using anon/auth credentials
CREATE POLICY "Allow public insert to roles" ON public.roles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to roles" ON public.roles
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete to roles" ON public.roles
  FOR DELETE USING (true);


-- 2. Create Employee Accounts table
CREATE TABLE IF NOT EXISTS public.employee_accounts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id   uuid UNIQUE,
  employee_id    text UNIQUE NOT NULL,
  role_name      text REFERENCES public.roles(name) ON UPDATE CASCADE ON DELETE SET NULL,
  email          text UNIQUE NOT NULL,
  created_at     timestamptz DEFAULT now()
);

-- Enable RLS for employee_accounts
ALTER TABLE public.employee_accounts ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to avoid duplicate errors
DROP POLICY IF EXISTS "Allow public read access to employee_accounts" ON public.employee_accounts;
DROP POLICY IF EXISTS "Allow service_role full access to employee_accounts" ON public.employee_accounts;
DROP POLICY IF EXISTS "Allow public insert to employee_accounts" ON public.employee_accounts;
DROP POLICY IF EXISTS "Allow public update to employee_accounts" ON public.employee_accounts;
DROP POLICY IF EXISTS "Allow public delete to employee_accounts" ON public.employee_accounts;

-- Allow read access
CREATE POLICY "Allow public read access to employee_accounts" ON public.employee_accounts
  FOR SELECT USING (true);

-- Allow all operations to service_role key
CREATE POLICY "Allow service_role full access to employee_accounts" ON public.employee_accounts
  FOR ALL TO service_role USING (true);

-- Allow insert, update, delete for server API routes using anon/auth credentials
CREATE POLICY "Allow public insert to employee_accounts" ON public.employee_accounts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to employee_accounts" ON public.employee_accounts
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete to employee_accounts" ON public.employee_accounts
  FOR DELETE USING (true);


-- 3. Seed default roles
INSERT INTO public.roles (name, permissions)
VALUES 
  ('superadmin', ARRAY['Bookings', 'Customers', 'Providers', 'Services', 'Settings']),
  ('admin', ARRAY['Bookings', 'Customers', 'Providers', 'Services', 'Settings']),
  ('receptionist', ARRAY['Bookings', 'Customers'])
ON CONFLICT (name) DO UPDATE 
SET permissions = EXCLUDED.permissions;


-- 4. Link Saif's Auth User to the employee_accounts table
INSERT INTO public.employee_accounts (auth_user_id, employee_id, role_name, email)
VALUES ('08191193-45c0-4c65-ae37-6dd84677055a', 'superadmin', 'superadmin', 'saif@superadmin.com')
ON CONFLICT (email) DO UPDATE
SET auth_user_id = EXCLUDED.auth_user_id,
    role_name = EXCLUDED.role_name,
    employee_id = EXCLUDED.employee_id;


-- 5. Bypass email confirmation
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id = '08191193-45c0-4c65-ae37-6dd84677055a';
