-- 20260725160000_add_customer_id_to_product_sales.sql
--
-- Context: RISK-014. The POS route has always sent a `customer_id` in its insert
-- payload, but no such column exists on `product_sales` — which is one of the
-- reasons every POS insert failed and fell through to the `page_settings` JSON
-- blob. The sale's link to a patient was only ever kept as `customer_name` /
-- `customer_phone` text, which is the same fragile string-matching pattern that
-- RISK-015 documents for doctor attribution.
--
-- PROPOSAL-002 Phase 1 needs retail sales to join to a patient record, so the
-- column is added rather than dropped from the route.
--
-- Idempotent: safe to re-run. See supabase/migrations/README.md — migrations are
-- applied by hand, so also update ai_docs/FINANCE_TRACKER.md when this is run.

ALTER TABLE public.product_sales
  ADD COLUMN IF NOT EXISTS customer_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_sales_customer_id_fkey'
  ) THEN
    ALTER TABLE public.product_sales
      ADD CONSTRAINT product_sales_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS product_sales_customer_id_idx
  ON public.product_sales (customer_id);

-- Useful for every period-based revenue rollup in the Finance module.
CREATE INDEX IF NOT EXISTS product_sales_sale_date_idx
  ON public.product_sales (sale_date);
