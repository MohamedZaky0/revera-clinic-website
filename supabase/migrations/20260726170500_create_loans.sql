CREATE TABLE IF NOT EXISTS public.loans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lender        text NOT NULL,
  principal     numeric NOT NULL CHECK (principal > 0),
  annual_rate   numeric NOT NULL DEFAULT 0,
  term_months   integer NOT NULL CHECK (term_months > 0),
  started_on    date NOT NULL,
  installment   numeric NOT NULL DEFAULT 0,
  is_opening    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
