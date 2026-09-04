-- 20260726010000_create_invoices.sql
--
-- PROPOSAL-002 Phase 1, task 1.1. The anchor table for the financial ledger — see
-- ai_docs/FINANCE_TRACKER.md "Phase 1 — Financial Ledger Spine" for the full task breakdown
-- and ai_docs/PROPOSALS.md PROPOSAL-002 Phase 1 for the design rationale.
--
-- Why this exists instead of more columns on reservations (RISK-010): a reservation row is
-- mutated repeatedly across its lifecycle (status, doctor, notes, service list), so nothing
-- prevents a later edit from silently changing a figure that must never change once money has
-- changed hands. An invoice is an event record: written once at issue time, never updated
-- (only voided). grand_total is stored tax-inclusive with tax_rate on invoice_lines, not here
-- (DEC-021) — a tax split stays derivable without storing it redundantly at invoice level.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no      text UNIQUE NOT NULL,
  reservation_id  uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  customer_id     uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  branch_id       uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  issued_at       timestamptz NOT NULL DEFAULT now(),
  subtotal        numeric NOT NULL DEFAULT 0,
  discount_total  numeric NOT NULL DEFAULT 0,
  grand_total     numeric NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'void')),
  is_opening      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Backs invoice_no formatting (application-side, see src/lib/ledger.ts formatInvoiceNo) —
-- gap-tolerant is fine (DEC-014: management accounting, not statutory bookkeeping), a DB
-- sequence just avoids an application-level race condition on the next number.
CREATE SEQUENCE IF NOT EXISTS public.invoice_no_seq START 1;

CREATE INDEX IF NOT EXISTS invoices_customer_id_idx ON public.invoices (customer_id);
CREATE INDEX IF NOT EXISTS invoices_reservation_id_idx ON public.invoices (reservation_id);
CREATE INDEX IF NOT EXISTS invoices_issued_at_idx ON public.invoices (issued_at);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
