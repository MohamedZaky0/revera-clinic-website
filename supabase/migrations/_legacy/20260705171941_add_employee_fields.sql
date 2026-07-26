-- Add extra fields to employee_accounts table to support shifts, department, phone, salary, etc.
ALTER TABLE public.employee_accounts ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.employee_accounts ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.employee_accounts ADD COLUMN IF NOT EXISTS department text DEFAULT 'Reception';
ALTER TABLE public.employee_accounts ADD COLUMN IF NOT EXISTS shift text DEFAULT 'Day'; -- "Day", "Night", or custom time ranges like "09:00 - 17:00"
ALTER TABLE public.employee_accounts ADD COLUMN IF NOT EXISTS salary numeric DEFAULT 0;
