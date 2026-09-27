-- 20260925000000_pulse_revenue_recognition.sql
--
-- DEC-088 / RISK-104: recognise laser-pulse package revenue per pulse consumed (extends DEC-023).
-- Pulses packages had no revenue recognition at all: package_revenue_recognitions was only written by
-- consume_customer_package_session (services packages), so the P&L never saw laser package revenue.
--
-- Idempotent: safe to re-run. NOT APPLIED BY THE ASSISTANT TO PRODUCTION — the owner applies it.
-- Additive only: no existing row or function signature changes; a re-run after a partial failure is safe.

-- 1) A historical package whose invoice value was never entered has an unknown price (DEC-088 item 6).
--    While pending, no revenue is recognised for it and the Finance screen lists it separately.
ALTER TABLE public.customer_packages
  ADD COLUMN IF NOT EXISTS price_pending boolean NOT NULL DEFAULT false;

-- 2) Let package_revenue_recognitions carry a pulses consumption (no customer_package_item exists for a
--    pulses package). Exactly one source per session row: an item (services package) or a pulse usage row.
--    'expiry_breakage' rows (DEC-088 item 5, not built yet) have neither, so they are exempt.
ALTER TABLE public.package_revenue_recognitions
  ALTER COLUMN customer_package_item_id DROP NOT NULL;

ALTER TABLE public.package_revenue_recognitions
  ADD COLUMN IF NOT EXISTS package_pulse_usage_id uuid
  REFERENCES public.package_pulse_usage(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'package_revenue_recognitions_one_source_chk'
      AND conrelid = 'public.package_revenue_recognitions'::regclass
  ) THEN
    ALTER TABLE public.package_revenue_recognitions
      ADD CONSTRAINT package_revenue_recognitions_one_source_chk
      CHECK (
        reason = 'expiry_breakage'
        OR ((customer_package_item_id IS NOT NULL) <> (package_pulse_usage_id IS NOT NULL))
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS package_revenue_recognitions_pulse_usage_uq
  ON public.package_revenue_recognitions (package_pulse_usage_id)
  WHERE package_pulse_usage_id IS NOT NULL;

-- 3) Recognise ONE pulse usage row. Pro-rata on the package total (DEC-088 item 2): with
--    T(n) = least(price_paid, round(price_paid * n / total_pulses, 2)), a usage row that consumed pulses
--    number (before+1 .. before+qty) in usage order (created_at, id) over ALL of the package's usage rows is
--    worth T(before + qty) - T(before). The amount is a pure function of that range, so ranges never overlap,
--    the amounts telescope to exactly price_paid at depletion, and a row that is linked to its booking (or whose
--    package price is confirmed) later gets the same amount it would have had live — order of recognition does
--    not matter. Returns the amount recognised (0 when nothing was written). The caller holds the package lock.
--    Writes nothing when: the price is still pending or zero, the quota is not configured, the usage has no
--    reservation yet (DEC-088 item 10 - reports join reservations!inner, so it would vanish from them; its share
--    stays deferred until linked), or the usage row already has a recognition (idempotent).
CREATE OR REPLACE FUNCTION public.recognise_pulse_usage(p_usage_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_usage      public.package_pulse_usage%ROWTYPE;
  v_pkg        public.customer_packages%ROWTYPE;
  v_before     numeric;
  v_amount     numeric;
BEGIN
  SELECT * INTO v_usage FROM public.package_pulse_usage WHERE id = p_usage_id;
  IF NOT FOUND OR v_usage.reservation_id IS NULL THEN
    RETURN 0;
  END IF;

  IF EXISTS (SELECT 1 FROM public.package_revenue_recognitions WHERE package_pulse_usage_id = p_usage_id) THEN
    RETURN 0;
  END IF;

  SELECT * INTO v_pkg FROM public.customer_packages WHERE id = v_usage.customer_package_id;
  IF NOT FOUND
     OR v_pkg.price_pending
     OR COALESCE(v_pkg.price_paid, 0) <= 0
     OR COALESCE(v_pkg.total_pulses, 0) <= 0 THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(u.quantity_used), 0) INTO v_before
    FROM public.package_pulse_usage u
   WHERE u.customer_package_id = v_usage.customer_package_id
     AND (u.created_at, u.id) < (v_usage.created_at, v_usage.id);

  v_amount :=
      least(round(v_pkg.price_paid, 2), round(v_pkg.price_paid * (v_before + v_usage.quantity_used) / v_pkg.total_pulses, 2))
    - least(round(v_pkg.price_paid, 2), round(v_pkg.price_paid * v_before / v_pkg.total_pulses, 2));

  IF v_amount <= 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.package_revenue_recognitions
    (customer_package_id, customer_package_item_id, package_pulse_usage_id, reservation_id,
     recognised_at, recognised_amount, reason)
  VALUES
    (v_usage.customer_package_id, NULL, p_usage_id, v_usage.reservation_id,
     v_usage.created_at, v_amount, 'session');

  RETURN v_amount;
END;
$$;

-- 4) consume_package_pulses (Brief 34B) — identical behaviour, plus the recognition in the same
--    transaction and under the same row lock. Same signature, so every caller is unchanged.
CREATE OR REPLACE FUNCTION public.consume_package_pulses(
  p_customer_package_id uuid,
  p_qty                 integer,
  p_reservation_id      uuid DEFAULT NULL,
  p_used_by             text DEFAULT NULL,
  p_treatment_area      text DEFAULT NULL,
  p_notes               text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_pkg        public.customer_packages%ROWTYPE;
  v_usage      public.package_pulse_usage%ROWTYPE;
  v_consumed   integer;
  v_recognised numeric;
BEGIN
  SELECT * INTO v_pkg
    FROM public.customer_packages
   WHERE id = p_customer_package_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer package not found';
  END IF;

  -- Idempotent replay: same (package, reservation) already consumed — return it, change nothing.
  IF p_reservation_id IS NOT NULL THEN
    SELECT * INTO v_usage
      FROM public.package_pulse_usage
     WHERE customer_package_id = p_customer_package_id
       AND reservation_id = p_reservation_id;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'consumed',         v_usage.quantity_used,
        'requested',        p_qty,
        'remaining',        v_pkg.pulses_remaining,
        'already_deducted', true,
        'used_total',       v_pkg.pulses_used,
        'total_pulses',     v_pkg.total_pulses,
        'recognised',       0
      );
    END IF;
  END IF;

  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'quantity of pulses to consume must be greater than 0';
  END IF;

  IF v_pkg.expires_at IS NOT NULL AND v_pkg.expires_at < now() THEN
    RAISE EXCEPTION 'package has expired';
  END IF;

  IF v_pkg.total_pulses IS NULL OR v_pkg.total_pulses <= 0 THEN
    RAISE EXCEPTION 'package pulse quota is not configured';
  END IF;

  IF v_pkg.pulses_remaining IS NULL OR v_pkg.pulses_remaining <= 0 THEN
    RAISE EXCEPTION 'package has 0 remaining pulses';
  END IF;

  v_consumed := least(p_qty, greatest(v_pkg.pulses_remaining, 0));

  UPDATE public.customer_packages
     SET pulses_used      = pulses_used + v_consumed,
         pulses_remaining = greatest(0, pulses_remaining - v_consumed),
         status           = CASE WHEN pulses_remaining - v_consumed <= 0
                                 THEN 'fully_used' ELSE status END
   WHERE id = p_customer_package_id
   RETURNING * INTO v_pkg;

  INSERT INTO public.package_pulse_usage
    (customer_package_id, reservation_id, quantity_used, remaining_after, used_by, treatment_area, notes)
  VALUES
    (p_customer_package_id, p_reservation_id, v_consumed, v_pkg.pulses_remaining,
     p_used_by, p_treatment_area, p_notes)
  RETURNING * INTO v_usage;

  v_recognised := public.recognise_pulse_usage(v_usage.id);

  RETURN jsonb_build_object(
    'consumed',         v_consumed,
    'requested',        p_qty,
    'remaining',        v_pkg.pulses_remaining,
    'already_deducted', false,
    'used_total',       v_pkg.pulses_used,
    'total_pulses',     v_pkg.total_pulses,
    'recognised',       v_recognised
  );
END;
$$;

-- 5) Catch-up for one package: recognise every usage row that has a booking and no recognition yet,
--    in usage order. Used by the one-time backfill and by "Enter invoice value" (DEC-088 item 6) once a
--    pending price is set. Locks the package so it cannot interleave with a live consume.
CREATE OR REPLACE FUNCTION public.recognise_package_pulses_catchup(p_customer_package_id uuid)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_row   record;
  v_count integer := 0;
BEGIN
  PERFORM 1 FROM public.customer_packages WHERE id = p_customer_package_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer package not found';
  END IF;

  FOR v_row IN
    SELECT u.id
      FROM public.package_pulse_usage u
     WHERE u.customer_package_id = p_customer_package_id
       AND u.reservation_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.package_revenue_recognitions r WHERE r.package_pulse_usage_id = u.id
       )
     ORDER BY u.created_at, u.id
  LOOP
    IF public.recognise_pulse_usage(v_row.id) > 0 THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Same exposure rule as consume_package_pulses (20260922000000): these mutate revenue rows, and PostgREST
-- exposes every public function to the anon key that ships in the browser bundle.
REVOKE ALL ON FUNCTION public.recognise_pulse_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recognise_pulse_usage(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.recognise_package_pulses_catchup(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recognise_package_pulses_catchup(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.consume_package_pulses(uuid, integer, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_package_pulses(uuid, integer, uuid, text, text, text)
  TO service_role;
