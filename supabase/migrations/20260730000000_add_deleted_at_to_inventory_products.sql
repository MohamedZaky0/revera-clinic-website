-- Soft-delete support for inventory_products. `consumption_entries.product_id` is
-- ON DELETE RESTRICT, so a hard delete of any product ever consumed in a checkout silently fails
-- at the DB layer -- this is why "delete product" appeared to do nothing. Everyone gets a
-- soft-delete (sets deleted_at, row and its history survive); only a superadmin may still hard
-- delete via the API's explicit ?hard=true flag.
ALTER TABLE public.inventory_products
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS inventory_products_deleted_at_idx ON public.inventory_products (deleted_at);
