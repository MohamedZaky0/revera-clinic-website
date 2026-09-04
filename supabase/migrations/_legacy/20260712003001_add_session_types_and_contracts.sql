-- Add contract columns to employee_accounts table
ALTER TABLE public.employee_accounts ADD COLUMN IF NOT EXISTS contract_file text;
ALTER TABLE public.employee_accounts ADD COLUMN IF NOT EXISTS contract_file_name text;

-- Create audit logs table for provider schedules
CREATE TABLE IF NOT EXISTS public.provider_schedule_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.providers(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  changed_by text NOT NULL,
  action text NOT NULL,
  previous_schedule jsonb,
  new_schedule jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
