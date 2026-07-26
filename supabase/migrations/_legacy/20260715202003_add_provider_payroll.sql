-- Alter providers table to support fixed salary and commission settings
ALTER TABLE public.providers 
  ADD COLUMN IF NOT EXISTS fixed_salary numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS commission_value numeric NOT NULL DEFAULT 0;

-- Create doctor_payroll table
CREATE TABLE IF NOT EXISTS public.doctor_payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.providers(id) ON DELETE CASCADE,
  month text NOT NULL, -- Format: YYYY-MM
  fixed_salary numeric NOT NULL DEFAULT 0,
  commission_type text NOT NULL DEFAULT 'none',
  commission_value numeric NOT NULL DEFAULT 0,
  completed_services_count integer NOT NULL DEFAULT 0,
  total_commission_earned numeric NOT NULL DEFAULT 0,
  net_salary numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Draft', -- Draft, Paid
  payment_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (provider_id, month)
);

-- Disable Row Level Security (RLS) to match other providers/scheduling tables in the website
ALTER TABLE public.doctor_payroll DISABLE ROW LEVEL SECURITY;
