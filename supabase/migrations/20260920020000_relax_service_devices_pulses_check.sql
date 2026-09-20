-- Migration: Relax check constraint on service_devices.pulses_per_session to allow 0 or positive values
ALTER TABLE public.service_devices DROP CONSTRAINT IF EXISTS service_devices_pulses_per_session_check;
ALTER TABLE public.service_devices ADD CONSTRAINT service_devices_pulses_per_session_check CHECK (pulses_per_session >= 0);
ALTER TABLE public.service_devices ALTER COLUMN pulses_per_session SET DEFAULT 0;
