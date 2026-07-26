CREATE TABLE IF NOT EXISTS public.consumption_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.inventory_products(id) ON DELETE RESTRICT,
  qty numeric NOT NULL CHECK (qty >= 0),
  unit_cost_snapshot numeric NOT NULL DEFAULT 0 CHECK (unit_cost_snapshot >= 0),
  was_edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consumption_entries_reservation_id_idx
  ON public.consumption_entries (reservation_id);
CREATE INDEX IF NOT EXISTS consumption_entries_product_id_idx
  ON public.consumption_entries (product_id);

ALTER TABLE public.consumption_entries ENABLE ROW LEVEL SECURITY;
