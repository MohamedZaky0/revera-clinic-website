-- 20260726010300_create_wallet_txns.sql
--
-- PROPOSAL-002 Phase 1, task 1.4. Depends on 20260726010000_create_invoices.sql.
--
-- What this fixes permanently, not just patches: customers.wallet_balance is overwritten with
-- a computed scalar on every checkout (task 0.5 fixed the arithmetic to use deltas), but
-- top-ups, spends and change-deposits are still indistinguishable after the write. wallet_txns
-- is one row per movement; wallet_balance becomes
-- SUM(CASE WHEN direction='in' THEN amount ELSE -amount END) — auditable and reconstructable,
-- not just correctly-computed-going-forward. See RISK-012 / RISK-016.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.wallet_txns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  direction    text NOT NULL CHECK (direction IN ('in', 'out')),
  amount       numeric NOT NULL CHECK (amount > 0),
  reason       text NOT NULL,
  invoice_id   uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  is_opening   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_txns_customer_id_idx ON public.wallet_txns (customer_id);

ALTER TABLE public.wallet_txns ENABLE ROW LEVEL SECURITY;
