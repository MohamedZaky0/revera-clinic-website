-- 20260922000000_package_pulse_balance_to_columns.sql
--
-- Brief 34B / RISK-096: move the per-patient package pulse balance off the shared
-- page_settings 'customer_package_pulses' JSON blob (one read-modify-write row for the whole
-- clinic, so concurrent consumes lose deductions) onto the real customer_packages columns,
-- with a per-usage audit table and an atomic consume function.
--
-- Idempotent: safe to re-run. NOT APPLIED BY THE ASSISTANT — the owner applies it manually.

-- 1) Per-usage audit table. customer_package_id + reservation_id is unique so a retried
--    consume for the same booking is idempotent at the database level.
CREATE TABLE IF NOT EXISTS public.package_pulse_usage (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_package_id  uuid NOT NULL REFERENCES public.customer_packages(id) ON DELETE CASCADE,
  reservation_id       uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  quantity_used        integer NOT NULL,
  remaining_after      integer NOT NULL,
  used_by              text,
  treatment_area       text,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS package_pulse_usage_customer_package_id_idx
  ON public.package_pulse_usage(customer_package_id);

CREATE UNIQUE INDEX IF NOT EXISTS package_pulse_usage_pkg_reservation_uq
  ON public.package_pulse_usage (customer_package_id, reservation_id)
  WHERE reservation_id IS NOT NULL;

ALTER TABLE public.package_pulse_usage ENABLE ROW LEVEL SECURITY;

-- 2) Atomic consume. The FOR UPDATE row lock is what serialises concurrent consumes — a bare
--    UPDATE cannot carry the idempotency read and the usage insert in the same statement.
--    'fully_used', never 'completed': the customer_packages CHECK is
--    ('active','expired','fully_used') (20260726010500_create_customer_packages.sql).
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
  v_pkg      public.customer_packages%ROWTYPE;
  v_usage    public.package_pulse_usage%ROWTYPE;
  v_consumed integer;
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
        'total_pulses',     v_pkg.total_pulses
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
     p_used_by, p_treatment_area, p_notes);

  RETURN jsonb_build_object(
    'consumed',         v_consumed,
    'requested',        p_qty,
    'remaining',        v_pkg.pulses_remaining,
    'already_deducted', false,
    'used_total',       v_pkg.pulses_used,
    'total_pulses',     v_pkg.total_pulses
  );
END;
$$;

-- PostgREST exposes every public function at /rest/v1/rpc/… to the anon key, which ships in the
-- browser bundle. Without this revoke anyone could drain any patient's pulses. (Contrast
-- next_invoice_no() in 20260726010600, which has no grants — harmless for a sequence, not here.)
REVOKE ALL ON FUNCTION public.consume_package_pulses(uuid, integer, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_package_pulses(uuid, integer, uuid, text, text, text)
  TO service_role;
