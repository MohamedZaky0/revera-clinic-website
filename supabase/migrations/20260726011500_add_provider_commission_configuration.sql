UPDATE public.providers
SET commission_type = 'none'
WHERE commission_type IS NULL
   OR commission_type NOT IN ('fixed', 'percentage', 'both', 'none');

ALTER TABLE public.providers
  ALTER COLUMN commission_type SET DEFAULT 'none',
  ALTER COLUMN commission_type SET NOT NULL;

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS commission_base text NOT NULL DEFAULT 'gross'
  CHECK (commission_base IN ('gross', 'net_of_materials')),
  ADD COLUMN IF NOT EXISTS commission_fixed_component numeric NOT NULL DEFAULT 0
  CHECK (commission_fixed_component >= 0);

ALTER TABLE public.providers
  DROP CONSTRAINT IF EXISTS providers_commission_type_check;

ALTER TABLE public.providers
  ADD CONSTRAINT providers_commission_type_check
  CHECK (commission_type IN ('fixed', 'percentage', 'both', 'none'));
