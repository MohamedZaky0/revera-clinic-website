CREATE TABLE IF NOT EXISTS public.expense_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  kind       text NOT NULL CHECK (kind IN ('fixed', 'variable')),
  parent_id  uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
