-- Budget line per expense category/branch/month (task 4.11). Minimal table scoped to exactly
-- what the budget-vs-actual report needs -- one budgeted number per category/branch/month, not a
-- general budgeting system. See FINANCE_TRACKER.md task 4.11 and DB_SCHEMA.md `budget_lines`.
CREATE TABLE IF NOT EXISTS public.budget_lines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   uuid NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  branch_id     uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  period        text NOT NULL,  -- 'YYYY-MM'
  budgeted      numeric NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, branch_id, period)
);

ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
