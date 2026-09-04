-- 20260817020000_create_reservation_products.sql
--
-- DEC-042: pre-invoice staging for products/additional-services/device-pulses added to a
-- reservation during a live session (doctor portal) or by reception (booking-details drawer).
--
-- Root problem this replaces: those additions were only ever persisted as free-text sentences
-- appended to reservations.notes, reconstructed on read by three independent regex parsers
-- (RISK-038, RISK-057 -- the second occurrence of the exact same bug class). Worse, they never
-- reached the real invoices/invoice_lines ledger (DEC-019) at all -- writeCheckoutInvoice() only
-- ever built lines from serviceIds, so this revenue was invisible to Finance reporting.
--
-- This table is explicitly NOT a parallel ledger. It is scoped as pre-invoice staging: rows are
-- written the moment an item is added to an in-progress reservation, and writeCheckoutInvoice()
-- (src/app/api/reservations/route.ts) is extended to read them and emit one invoice_lines row per
-- entry at completion time -- the same ledger DEC-019 already established, not a second one next
-- to it. Once an invoice is issued for a reservation, its reservation_products rows become
-- historical input to that immutable invoice, same relationship purchase_lines/consumption_entries
-- already have to their own downstream tables.
--
-- product_id is text, matching inventory_products.id's actual column type (see invoice_lines,
-- consumption_entries -- both already reference it this way). service_id is bigint, matching
-- services.id (see invoice_lines.service_id). Both nullable: a product-line row has a product_id
-- and no service_id; an additional_service row has a service_id and no product_id; a
-- device_pulses row has neither (device identity/pulse count live in the description field, same
-- as the [Extra Device Pulses] notes format did -- no inventory_devices FK here, out of scope for
-- this migration to avoid widening it further).
--
-- RLS enabled with no policies, matching invoice_lines/consumption_entries/purchase_lines exactly
-- -- deny-all for anon/authenticated, service-role-only access (DEC-003: every API route uses the
-- service role key). No dashboard/direct-table access is expected for this table.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.reservation_products (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id        uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  line_type             text NOT NULL CHECK (line_type IN ('product', 'additional_service', 'device_pulses')),
  product_id            text REFERENCES public.inventory_products(id) ON DELETE SET NULL,
  service_id            bigint REFERENCES public.services(id) ON DELETE SET NULL,
  description           text NOT NULL,
  qty                   numeric NOT NULL DEFAULT 1,
  unit_price            numeric NOT NULL DEFAULT 0,
  total                 numeric NOT NULL DEFAULT 0,
  added_by_employee_id  uuid REFERENCES public.employee_accounts(id) ON DELETE SET NULL,
  added_by_role         text NOT NULL CHECK (added_by_role IN ('doctor_session', 'receptionist')),
  invoiced_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservation_products_reservation_id_idx
  ON public.reservation_products (reservation_id);
CREATE INDEX IF NOT EXISTS reservation_products_product_id_idx
  ON public.reservation_products (product_id);

ALTER TABLE public.reservation_products ENABLE ROW LEVEL SECURITY;
