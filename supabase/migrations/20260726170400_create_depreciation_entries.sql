CREATE TABLE IF NOT EXISTS public.depreciation_entries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id          uuid NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  period            text NOT NULL,  -- 'YYYY-MM'
  amount            numeric NOT NULL DEFAULT 0,
  book_value_after  numeric NOT NULL DEFAULT 0,
  is_opening        boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, period)
);

CREATE INDEX IF NOT EXISTS depreciation_entries_asset_id_idx
  ON public.depreciation_entries (asset_id);

ALTER TABLE public.depreciation_entries ENABLE ROW LEVEL SECURITY;
