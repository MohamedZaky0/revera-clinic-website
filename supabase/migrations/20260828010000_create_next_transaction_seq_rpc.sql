-- 20260828010000_create_next_transaction_seq_rpc.sql
--
-- PostgREST/supabase-js cannot call the built-in nextval() directly -- .rpc() only reaches
-- functions explicitly defined in the database. Wraps transaction_seq (created in
-- 20260828000000_create_transactions.sql) so POST /api/transactions can get an atomic,
-- race-condition-free next value instead of a random 4-digit number, which had a realistic
-- collision probability against transactions.transaction_id's UNIQUE constraint at normal
-- clinic transaction volume. Mirrors next_invoice_no() (20260726010600).
--
-- Returns the raw integer; formatting ('TXN-001045') stays in the route (formatTxnId).
--
-- Idempotent: safe to re-run.

CREATE OR REPLACE FUNCTION public.next_transaction_seq()
RETURNS bigint
LANGUAGE sql
AS $$
  SELECT nextval('public.transaction_seq');
$$;
