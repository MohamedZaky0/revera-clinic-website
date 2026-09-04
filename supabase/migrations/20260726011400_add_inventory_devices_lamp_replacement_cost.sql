ALTER TABLE public.inventory_devices
  ADD COLUMN IF NOT EXISTS lamp_replacement_cost numeric NOT NULL DEFAULT 0
  CHECK (lamp_replacement_cost >= 0);
