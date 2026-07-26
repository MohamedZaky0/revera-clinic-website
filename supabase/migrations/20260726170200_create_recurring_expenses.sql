CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  uuid NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
  branch_id    uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  amount       numeric NOT NULL CHECK (amount > 0),
  cadence      text NOT NULL CHECK (cadence IN ('monthly', 'quarterly', 'yearly')),
  next_due_on  date NOT NULL,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recurring_expenses_next_due_on_idx
  ON public.recurring_expenses (next_due_on) WHERE active;

-- Backfill the FK deferred in 20260726170100_create_expenses.sql, now that this table exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_recurring_id_fkey'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_recurring_id_fkey
      FOREIGN KEY (recurring_id) REFERENCES public.recurring_expenses(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
