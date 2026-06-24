-- ============================================================
-- Revera Clinics — Link Superadmin Auth Account
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/whmukkypceuizscpjcdo/sql/new
-- ============================================================

-- 1. Ensure the superadmin role exists in the roles table
INSERT INTO public.roles (name, permissions)
VALUES ('superadmin', ARRAY['Bookings', 'Customers', 'Providers', 'Services', 'Settings'])
ON CONFLICT (name) DO NOTHING;

-- 2. Link your newly created Auth User to the employee_accounts table
INSERT INTO public.employee_accounts (auth_user_id, employee_id, role_name, email)
VALUES ('08191193-45c0-4c65-ae37-6dd84677055a', 'superadmin', 'superadmin', 'saif@superadmin.com')
ON CONFLICT (email) DO UPDATE
SET auth_user_id = EXCLUDED.auth_user_id,
    role_name = EXCLUDED.role_name,
    employee_id = EXCLUDED.employee_id;

-- 3. Bypassing email confirmation (fixes "Email not confirmed" error)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id = '08191193-45c0-4c65-ae37-6dd84677055a';
