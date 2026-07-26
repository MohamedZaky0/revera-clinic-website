CREATE TABLE IF NOT EXISTS public.service_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id bigint NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  device_id text NOT NULL REFERENCES public.inventory_devices(id) ON DELETE CASCADE,
  pulses_per_session integer NOT NULL CHECK (pulses_per_session > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, device_id)
);

CREATE INDEX IF NOT EXISTS service_devices_service_id_idx ON public.service_devices (service_id);

ALTER TABLE public.service_devices ENABLE ROW LEVEL SECURITY;
