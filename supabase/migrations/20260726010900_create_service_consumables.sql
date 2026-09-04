CREATE TABLE IF NOT EXISTS public.service_consumables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id bigint NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
  standard_qty numeric NOT NULL CHECK (standard_qty > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, product_id)
);

CREATE INDEX IF NOT EXISTS service_consumables_service_id_idx
  ON public.service_consumables (service_id);

ALTER TABLE public.service_consumables ENABLE ROW LEVEL SECURITY;
