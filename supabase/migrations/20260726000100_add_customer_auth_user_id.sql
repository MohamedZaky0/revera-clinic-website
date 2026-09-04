ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customers_auth_user_id_key'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_auth_user_id_key UNIQUE (auth_user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customers_auth_user_id_fkey'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_auth_user_id_fkey
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;
