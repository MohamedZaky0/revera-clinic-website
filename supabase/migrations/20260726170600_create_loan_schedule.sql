CREATE TABLE IF NOT EXISTS public.loan_schedule (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id         uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  period          text NOT NULL,  -- 'YYYY-MM'
  installment     numeric NOT NULL DEFAULT 0,
  interest_part   numeric NOT NULL DEFAULT 0,
  principal_part  numeric NOT NULL DEFAULT 0,
  balance_after   numeric NOT NULL DEFAULT 0,
  is_opening      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loan_id, period)
);

CREATE INDEX IF NOT EXISTS loan_schedule_loan_id_idx ON public.loan_schedule (loan_id);

ALTER TABLE public.loan_schedule ENABLE ROW LEVEL SECURITY;
