-- 20260726010400_create_packages.sql
--
-- PROPOSAL-002 Phase 1, task 1.5. No dependency on the invoices/payments migrations — can be
-- applied in either order relative to them.
--
-- branch_id is nullable = package sellable at every branch when unset, matching how
-- providers.branch_id and reservations.branch_id already treat a null branch as
-- "not branch-restricted."
--
-- on_expiry / extension_days implement DEC-025 (an expired package's undelivered sessions
-- either convert to revenue or the package is extended) as a per-package DEFAULT policy.
-- The manual per-customer extend action (task 1.13) bypasses this default entirely when used —
-- it is not read through resolveExpiry(), by design (DEC-025's manual override).
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.packages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  branch_id        uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  price            numeric NOT NULL DEFAULT 0,
  tax_rate         numeric NOT NULL DEFAULT 0,
  validity_days    integer NOT NULL DEFAULT 90,
  on_expiry        text NOT NULL DEFAULT 'extend'
                     CHECK (on_expiry IN ('recognise_revenue', 'extend')),
  extension_days   integer,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.package_items (
  package_id  uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  service_id  bigint NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  qty         integer NOT NULL DEFAULT 1,
  PRIMARY KEY (package_id, service_id)
);

CREATE INDEX IF NOT EXISTS packages_branch_id_idx ON public.packages (branch_id);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;
