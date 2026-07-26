-- 20260726010100_create_invoice_lines.sql
--
-- PROPOSAL-002 Phase 1, task 1.2. Depends on 20260726010000_create_invoices.sql.
--
-- package_id has NO foreign key constraint yet: public.packages does not exist until task
-- 1.5/1.6 (migrations run in filename order). The constraint is added by
-- 20260726010500_create_customer_packages.sql once packages exists — mirrors how
-- product_sales.customer_id got its FK in a later migration (20260725160000) once the
-- referenced table was in place. Do not "fix" this by reordering; it is intentional.
--
-- cogs_snapshot and commission_snapshot are nullable, not NOT NULL DEFAULT 0. Phase 1 alone
-- cannot populate them correctly: COGS needs Phase 2's service_consumables recipe, and
-- commission needs a doctor's contract terms applied at issue time. NULL honestly means
-- "not yet costed" — a future 0 would incorrectly claim "this line has zero cost."
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.invoice_lines (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id           uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  line_type            text NOT NULL CHECK (line_type IN ('service', 'product', 'package')),
  service_id           bigint REFERENCES public.services(id) ON DELETE SET NULL,
  product_id           text REFERENCES public.inventory_products(id) ON DELETE SET NULL,
  package_id           uuid, -- FK added in 20260726010500_create_customer_packages.sql
  description          text NOT NULL,
  qty                  numeric NOT NULL DEFAULT 1,
  unit_price           numeric NOT NULL DEFAULT 0,
  discount             numeric NOT NULL DEFAULT 0,
  tax_rate             numeric NOT NULL DEFAULT 0,
  line_total           numeric NOT NULL DEFAULT 0,
  cogs_snapshot        numeric,
  commission_snapshot  numeric,
  provider_id          uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_lines_invoice_id_idx ON public.invoice_lines (invoice_id);
CREATE INDEX IF NOT EXISTS invoice_lines_provider_id_idx ON public.invoice_lines (provider_id);

ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
