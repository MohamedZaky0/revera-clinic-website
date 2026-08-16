ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS date_of_birth date;
