CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  qty numeric NOT NULL CHECK (qty > 0),
  unit_cost numeric NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  reason text NOT NULL CHECK (reason IN ('purchase', 'sale', 'consumption', 'adjustment', 'opening')),
  ref_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_product_id_idx ON public.stock_movements (product_id);
CREATE INDEX IF NOT EXISTS stock_movements_occurred_at_idx ON public.stock_movements (occurred_at);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
