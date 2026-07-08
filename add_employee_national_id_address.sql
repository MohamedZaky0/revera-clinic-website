-- Add extra fields to employee_accounts table to support national id, national id front/back photos, and address
ALTER TABLE public.employee_accounts ADD COLUMN IF NOT EXISTS national_id text;
ALTER TABLE public.employee_accounts ADD COLUMN IF NOT EXISTS national_id_front text; -- Stores base64 data or image URL
ALTER TABLE public.employee_accounts ADD COLUMN IF NOT EXISTS national_id_back text;  -- Stores base64 data or image URL
ALTER TABLE public.employee_accounts ADD COLUMN IF NOT EXISTS address text;
