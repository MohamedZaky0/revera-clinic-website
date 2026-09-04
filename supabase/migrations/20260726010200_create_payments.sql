-- 20260726010200_create_payments.sql
--
-- PROPOSAL-002 Phase 1, task 1.3. Depends on 20260726010000_create_invoices.sql.
--
-- What this fixes: reservations.amount_paid is one mutable number, so a booking paid in two
-- installments (a deposit, then the remainder weeks later) can never show when each part was
-- paid or how (cash vs card vs wallet). payments is one row per receipt.
-- SUM(amount) WHERE invoice_id = X reconstructs the running total; the individual rows give
-- the history a single column structurally cannot hold.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.payments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id               uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  received_at              timestamptz NOT NULL DEFAULT now(),
  amount                   numeric NOT NULL,
  method                   text NOT NULL DEFAULT 'cash'
                             CHECK (method IN ('cash', 'card', 'wallet', 'instapay', 'transfer')),
  received_by_employee_id  uuid REFERENCES public.employee_accounts(id) ON DELETE SET NULL,
  reference                text,
  is_opening               boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS payments_received_at_idx ON public.payments (received_at);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
