-- 20260828000000_create_transactions.sql
--
-- Financial Transactions & Daily Ledger Engine
-- Creates the public.transactions table, public.transaction_audit_logs table,
-- sequence for human-friendly transaction IDs (TXN-XXXXXX), and enables RLS.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.transactions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id           text UNIQUE NOT NULL,
  branch_id                uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  customer_id              uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_id               uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  reservation_id           uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  type                     text NOT NULL CHECK (type IN (
                             'payment',
                             'outstanding_payment',
                             'refund',
                             'wallet_topup',
                             'wallet_deduction',
                             'service_charge',
                             'product_purchase',
                             'adjustment'
                           )),
  description              text NOT NULL,
  payment_method           text NOT NULL DEFAULT 'cash' CHECK (payment_method IN (
                             'cash',
                             'card',
                             'bank_transfer',
                             'online_payment',
                             'wallet',
                             'instapay',
                             'vodafone_cash',
                             'other',
                             'none'
                           )),
  amount                   numeric NOT NULL,
  status                   text NOT NULL DEFAULT 'completed' CHECK (status IN (
                             'completed',
                             'pending',
                             'outstanding',
                             'refunded',
                             'failed'
                           )),
  source                   text NOT NULL DEFAULT 'manual' CHECK (source IN (
                             'manual',
                             'automatic'
                           )),
  reference_no             text,
  related_transaction_id   uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  reason                   text,
  notes                    text,
  metadata                 jsonb DEFAULT '{}'::jsonb,
  created_by_employee_id   uuid REFERENCES public.employee_accounts(id) ON DELETE SET NULL,
  created_by_name          text,
  occurred_at              timestamptz NOT NULL DEFAULT now(),
  created_at               timestamptz NOT NULL DEFAULT now()
);

-- Sequence for formatting transaction_id (e.g. TXN-001001)
CREATE SEQUENCE IF NOT EXISTS public.transaction_seq START 1001;

-- Indexes for high performance querying & filtering
CREATE INDEX IF NOT EXISTS transactions_customer_id_idx ON public.transactions (customer_id);
CREATE INDEX IF NOT EXISTS transactions_branch_id_idx ON public.transactions (branch_id);
CREATE INDEX IF NOT EXISTS transactions_type_idx ON public.transactions (type);
CREATE INDEX IF NOT EXISTS transactions_status_idx ON public.transactions (status);
CREATE INDEX IF NOT EXISTS transactions_occurred_at_idx ON public.transactions (occurred_at DESC);
CREATE INDEX IF NOT EXISTS transactions_source_idx ON public.transactions (source);

-- Transaction Audit Logs Table
CREATE TABLE IF NOT EXISTS public.transaction_audit_logs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id           uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  action                   text NOT NULL,
  performed_by_employee_id uuid REFERENCES public.employee_accounts(id) ON DELETE SET NULL,
  performed_by_name        text,
  details                  jsonb DEFAULT '{}'::jsonb,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS txn_audit_logs_txn_id_idx ON public.transaction_audit_logs (transaction_id);
CREATE INDEX IF NOT EXISTS txn_audit_logs_created_at_idx ON public.transaction_audit_logs (created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_audit_logs ENABLE ROW LEVEL SECURITY;
