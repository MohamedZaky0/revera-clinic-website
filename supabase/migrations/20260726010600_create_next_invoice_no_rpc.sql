-- 20260726010600_create_next_invoice_no_rpc.sql
--
-- PROPOSAL-002 Phase 1, task 1.10. PostgREST/supabase-js cannot call the built-in nextval()
-- directly — .rpc() only reaches functions explicitly defined in the database. This wraps
-- invoice_no_seq (created in 20260726010000_create_invoices.sql) so the application can get an
-- atomic, race-condition-free next value with a single round trip, instead of falling back to
-- "SELECT the last invoice_no and add one" — which two concurrent checkouts could both read
-- before either writes, producing a duplicate that fails invoices.invoice_no's UNIQUE constraint.
--
-- Returns the raw integer; formatting ('INV-000042') stays in src/lib/ledger.ts
-- (formatInvoiceNo), matching this codebase's existing pattern of app-generated human-readable
-- IDs (REP-<timestamp>, sale-<timestamp>-<rand>) rather than a SQL-side formatting function.
--
-- Idempotent: safe to re-run.

CREATE OR REPLACE FUNCTION public.next_invoice_no()
RETURNS bigint
LANGUAGE sql
AS $$
  SELECT nextval('public.invoice_no_seq');
$$;
