-- 20260725180000_add_provider_id_and_duration_minutes.sql
--
-- PROPOSAL-002 Phase 0, tasks 0.7 and 0.8. Two columns the finance module cannot work
-- without. Idempotent: safe to re-run.
--
-- ---------------------------------------------------------------------------
-- 0.7  reservations.provider_id
-- ---------------------------------------------------------------------------
-- Doctor cost is currently attributed by matching reservations.doctor_name — free text —
-- against providers.name with a lowercased string compare
-- (src/app/api/hr/doctor-payroll/route.ts). A rename, a typo, a title prefix or two doctors
-- sharing a name silently detaches all historical commission, with no error. See RISK-015.
--
-- doctor_name is kept as a denormalised snapshot: it is what was recorded at the time, and
-- an invoice should not change because a provider row was later edited.

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS provider_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservations_provider_id_fkey'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Backfill by the same name match the application already relies on. Only rows where the
-- name resolves to EXACTLY ONE provider are linked — an ambiguous name is left null rather
-- than guessed, since a wrong link silently misattributes cost.
UPDATE public.reservations r
SET provider_id = m.provider_id
FROM (
  SELECT lower(btrim(p.name)) AS norm_name, min(p.id) AS provider_id
  FROM public.providers p
  WHERE p.name IS NOT NULL AND btrim(p.name) <> ''
  GROUP BY lower(btrim(p.name))
  HAVING count(*) = 1
) m
WHERE r.provider_id IS NULL
  AND r.doctor_name IS NOT NULL
  AND lower(btrim(r.doctor_name)) = m.norm_name;

CREATE INDEX IF NOT EXISTS reservations_provider_id_idx
  ON public.reservations (provider_id);

-- ---------------------------------------------------------------------------
-- 0.8  services.duration_minutes
-- ---------------------------------------------------------------------------
-- services.duration is free text ('1:30 Hours', '30 mins', '1:30') with no constraint and
-- no write-side validation. getDurationInMinutes() silently falls back to 30 for anything
-- it cannot parse, and the seeded services have no duration at all — so every capacity and
-- room-utilisation figure currently assumes 30 minutes for every service.
--
-- Capacity analysis (PROPOSAL-002 Phase 5) and the room-minutes overhead allocation
-- (DEC-015) both need a real number.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

-- Backfill mirroring src/lib/services.ts getDurationInMinutes(), in the same order.
-- Deliberately leaves NULL where the text is absent or unparseable, rather than writing a
-- 30-minute guess — a NULL is visible, a wrong number is not.
UPDATE public.services
SET duration_minutes = CASE
  -- "1:30 Hours"
  WHEN lower(btrim(duration)) ~ '(\d+):(\d+)\s*hour' THEN
    (substring(lower(btrim(duration)) from '(\d+):\d+\s*hour'))::int * 60
    + (substring(lower(btrim(duration)) from '\d+:(\d+)\s*hour'))::int
  -- "30 mins"
  WHEN lower(btrim(duration)) ~ '(\d+)\s*min' THEN
    (substring(lower(btrim(duration)) from '(\d+)\s*min'))::int
  -- "1 hour"
  WHEN lower(btrim(duration)) ~ '(\d+)\s*hour' THEN
    (substring(lower(btrim(duration)) from '(\d+)\s*hour'))::int * 60
  -- "1:30"
  WHEN btrim(duration) ~ '^(\d+):(\d+)$' THEN
    (substring(btrim(duration) from '^(\d+):'))::int * 60
    + (substring(btrim(duration) from ':(\d+)$'))::int
  ELSE NULL
END
WHERE duration_minutes IS NULL
  AND duration IS NOT NULL
  AND btrim(duration) <> '';

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_duration_minutes_check;

ALTER TABLE public.services
  ADD CONSTRAINT services_duration_minutes_check
  CHECK (duration_minutes IS NULL OR (duration_minutes > 0 AND duration_minutes <= 24 * 60));
