-- Add branch_id column to employee_accounts table to link employees with their assigned branch
ALTER TABLE public.employee_accounts ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
