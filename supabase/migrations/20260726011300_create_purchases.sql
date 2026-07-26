CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  paid numeric NOT NULL DEFAULT 0 CHECK (paid >= 0),
  due_date timestamptz,
  is_opening boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.inventory_products(id) ON DELETE RESTRICT,
  qty numeric NOT NULL CHECK (qty > 0),
  unit_cost numeric NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchases_supplier_id_idx ON public.purchases (supplier_id);
CREATE INDEX IF NOT EXISTS purchase_lines_purchase_id_idx ON public.purchase_lines (purchase_id);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_lines ENABLE ROW LEVEL SECURITY;
