-- 20260726010500_create_customer_packages.sql
--
-- PROPOSAL-002 Phase 1, task 1.6. Depends on 20260726010100_create_invoice_lines.sql and
-- 20260726010400_create_packages.sql.
--
-- Also backfills the invoice_lines.package_id FK deferred in 20260726010100, now that
-- packages exists.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.customer_packages (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id               uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  package_id                uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  invoice_id                uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  purchased_at              timestamptz NOT NULL DEFAULT now(),
  expires_at                timestamptz,
  price_paid                numeric NOT NULL DEFAULT 0,
  status                    text NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'expired', 'fully_used')),
  is_opening                boolean NOT NULL DEFAULT false,
  extended_by_employee_id   uuid REFERENCES public.employee_accounts(id) ON DELETE SET NULL,
  extended_at               timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_package_items (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_package_id    uuid NOT NULL REFERENCES public.customer_packages(id) ON DELETE CASCADE,
  service_id             bigint NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  qty_total              integer NOT NULL DEFAULT 0,
  qty_used               integer NOT NULL DEFAULT 0,
  qty_remaining          integer NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_packages_customer_id_idx ON public.customer_packages (customer_id);
CREATE INDEX IF NOT EXISTS cpi_customer_package_id_idx ON public.customer_package_items (customer_package_id);

ALTER TABLE public.customer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_package_items ENABLE ROW LEVEL SECURITY;

-- Backfill the FK deferred in 20260726010100_create_invoice_lines.sql, now that packages exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_lines_package_id_fkey'
  ) THEN
    ALTER TABLE public.invoice_lines
      ADD CONSTRAINT invoice_lines_package_id_fkey
      FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE SET NULL;
  END IF;
END $$;
