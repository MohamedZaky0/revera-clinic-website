-- Per-service doctor commission overrides.
-- Each entry: { service: string, serviceId?: number, type: 'none'|'fixed'|'percentage', value: number }
ALTER TABLE public.providers
ADD COLUMN IF NOT EXISTS service_commissions JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN public.providers.service_commissions IS
  'Per-service commission overrides for this provider. Fallback to global commission_type/value when a service is not listed here.';
