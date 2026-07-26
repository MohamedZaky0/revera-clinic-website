CREATE TABLE IF NOT EXISTS public.expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   uuid NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
  branch_id     uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  incurred_on   date NOT NULL,
  amount        numeric NOT NULL CHECK (amount > 0),
  vendor        text,
  note          text,
  recurring_id  uuid,  -- FK added in 20260726170200_create_recurring_expenses.sql, once that table exists
  is_opening    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_category_id_idx ON public.expenses (category_id);
CREATE INDEX IF NOT EXISTS expenses_branch_id_idx ON public.expenses (branch_id);
CREATE INDEX IF NOT EXISTS expenses_incurred_on_idx ON public.expenses (incurred_on);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
