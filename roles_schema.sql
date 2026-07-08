-- ============================================================
-- Revera Clinics — Admin Role Management System
-- Run this script in your Supabase SQL Editor
-- ============================================================

-- 1. Create Roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL,
  permissions text[] NOT NULL, -- list of allowed tabs e.g. ['Bookings', 'Customers', 'Providers', 'Services', 'Settings']
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Enable RLS for roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to roles (authenticated service role or client)
CREATE POLICY "Allow public read access to roles" ON public.roles
  FOR SELECT USING (true);

-- Allow all operations to service_role key
CREATE POLICY "Allow service_role full access to roles" ON public.roles
  FOR ALL TO service_role USING (true);


-- 2. Create Employee Accounts table
CREATE TABLE IF NOT EXISTS public.employee_accounts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id   uuid UNIQUE, -- References auth.users(id)
  employee_id    text UNIQUE NOT NULL,
  role_name      text REFERENCES public.roles(name) ON UPDATE CASCADE ON DELETE SET NULL,
  email          text UNIQUE NOT NULL,
  created_at     timestamptz DEFAULT now()
);

-- Enable RLS for employee_accounts
ALTER TABLE public.employee_accounts ENABLE ROW LEVEL SECURITY;

-- Allow public read access (client/service role lookup)
CREATE POLICY "Allow public read access to employee_accounts" ON public.employee_accounts
  FOR SELECT USING (true);

-- Allow all operations to service_role key
CREATE POLICY "Allow service_role full access to employee_accounts" ON public.employee_accounts
  FOR ALL TO service_role USING (true);


-- 3. Seed default roles
INSERT INTO public.roles (name, permissions)
VALUES 
  ('superadmin', ARRAY['Bookings', 'Customers', 'Providers', 'Services', 'Settings']),
  ('admin', ARRAY['Bookings', 'Customers', 'Providers', 'Services', 'Settings']),
  ('receptionist', ARRAY['Bookings', 'Customers'])
ON CONFLICT (name) DO UPDATE 
SET permissions = EXCLUDED.permissions;
