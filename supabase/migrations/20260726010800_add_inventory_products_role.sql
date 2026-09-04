ALTER TABLE public.inventory_products
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'retail'
  CHECK (role IN ('retail', 'consumable', 'both'));
