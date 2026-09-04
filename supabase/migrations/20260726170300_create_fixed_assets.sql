CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id          uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  category           text NOT NULL CHECK (category IN
                       ('furniture', 'medical_device', 'it', 'leasehold_improvement')),
  name               text NOT NULL,
  purchased_on       date NOT NULL,
  cost               numeric NOT NULL CHECK (cost >= 0),
  useful_life_months integer NOT NULL CHECK (useful_life_months > 0),
  salvage_value      numeric NOT NULL DEFAULT 0,
  status             text NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'disposed', 'fully_depreciated')),
  device_id          text REFERENCES public.inventory_devices(id) ON DELETE SET NULL,
  is_opening         boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fixed_assets_branch_id_idx ON public.fixed_assets (branch_id);
CREATE INDEX IF NOT EXISTS fixed_assets_device_id_idx ON public.fixed_assets (device_id);

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
