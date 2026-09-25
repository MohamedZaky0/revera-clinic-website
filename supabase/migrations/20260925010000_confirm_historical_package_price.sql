-- 20260925010000_confirm_historical_package_price.sql
--
-- DEC-088 item 6: a historical package added without an invoice value is stored price_pending (price_paid = 0) and
-- recognises no revenue. This function is what "Enter invoice value" calls: in ONE transaction, under the package row
-- lock, it sets the real price, records the pulses the patient had already used BEFORE the clinic started using the
-- system, clears the pending flag, and back-fills any revenue that could not be recognised while the price was unknown.
--
-- Pre-launch pulses are recorded as a package_pulse_usage row with NO reservation, dated at the purchase date, so they
-- sort first and count in the pro-rata ranges (later consumption is worth T(before+qty) - T(before)) but recognise no
-- revenue: that consumption happened before the ledger began (DEC-088 item 10 — a usage without a booking recognises
-- nothing). Only pulses consumed from now on earn revenue, at price_paid / total_pulses each.
--
-- Idempotent and additive; safe to re-run. NOT APPLIED TO PRODUCTION BY THE ASSISTANT unless the owner asks.

CREATE OR REPLACE FUNCTION public.confirm_historical_package_price(
  p_customer_package_id uuid,
  p_price               numeric,
  p_pulses_used         integer DEFAULT 0,
  p_employee_id         uuid    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_pkg          public.customer_packages%ROWTYPE;
  v_used         integer := COALESCE(p_pulses_used, 0);
  v_backfilled   integer := 0;
  v_total_sess   integer;
  v_price        numeric;
  v_cum          numeric;
  v_prev         numeric;
  v_k            integer := 0;
  v_row          record;
BEGIN
  SELECT * INTO v_pkg FROM public.customer_packages WHERE id = p_customer_package_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer package not found';
  END IF;

  IF p_price IS NULL OR p_price < 0 THEN
    RAISE EXCEPTION 'price must be zero or more';
  END IF;
  IF v_used < 0 THEN
    RAISE EXCEPTION 'pulses used must be zero or more';
  END IF;

  -- Idempotent: an already-confirmed package with the same price is a no-op; a different price is refused
  -- (correcting a confirmed price is a deliberate edit, not this action).
  IF NOT v_pkg.price_pending THEN
    IF v_pkg.price_paid = p_price AND v_used = 0 THEN
      RETURN jsonb_build_object('already_confirmed', true, 'price_paid', v_pkg.price_paid,
                                'pulses_used', v_pkg.pulses_used, 'pulses_remaining', v_pkg.pulses_remaining,
                                'recognition_rows', 0);
    END IF;
    RAISE EXCEPTION 'package price is already confirmed';
  END IF;

  IF v_pkg.package_type = 'pulses' THEN
    IF v_used > COALESCE(v_pkg.pulses_remaining, 0) THEN
      RAISE EXCEPTION 'pulses used exceeds the remaining balance';
    END IF;
    IF v_used > 0 THEN
      INSERT INTO public.package_pulse_usage
        (customer_package_id, reservation_id, quantity_used, remaining_after, used_by, notes, created_at)
      VALUES
        (p_customer_package_id, NULL, v_used, v_pkg.pulses_remaining - v_used, 'Pre-launch usage',
         'Pulses used before the clinic started using the system (entered when the package price was confirmed)',
         COALESCE(v_pkg.purchased_at, v_pkg.created_at));
    END IF;
    UPDATE public.customer_packages
       SET price_paid       = p_price,
           price_pending    = false,
           pulses_used      = COALESCE(pulses_used, 0) + v_used,
           pulses_remaining = greatest(0, COALESCE(pulses_remaining, 0) - v_used),
           status           = CASE WHEN COALESCE(pulses_remaining, 0) - v_used <= 0 THEN 'fully_used' ELSE status END
     WHERE id = p_customer_package_id
     RETURNING * INTO v_pkg;

    -- Recognise anything consumed while the price was unknown (usage rows with a booking and no recognition yet).
    v_backfilled := public.recognise_package_pulses_catchup(p_customer_package_id);
  ELSE
    IF v_used > 0 THEN
      RAISE EXCEPTION 'pulses do not apply to a services package';
    END IF;
    UPDATE public.customer_packages
       SET price_paid = p_price, price_pending = false
     WHERE id = p_customer_package_id
     RETURNING * INTO v_pkg;

    -- A services package consumed while the price was pending recorded zero-amount recognitions. Re-derive them
    -- with the same cumulative rule as consume_customer_package_session so the total equals the price at depletion.
    SELECT COALESCE(SUM(qty_total), 0) INTO v_total_sess
      FROM public.customer_package_items WHERE customer_package_id = p_customer_package_id;
    IF v_total_sess > 0 AND p_price > 0 THEN
      v_price := round(p_price, 2);
      v_prev := 0;
      FOR v_row IN
        SELECT id FROM public.package_revenue_recognitions
         WHERE customer_package_id = p_customer_package_id AND package_pulse_usage_id IS NULL AND reason = 'session'
         ORDER BY recognised_at, id
      LOOP
        v_k := v_k + 1;
        v_cum := least(v_price, round(round(v_price / v_total_sess, 2) * v_k, 2));
        UPDATE public.package_revenue_recognitions SET recognised_amount = v_cum - v_prev WHERE id = v_row.id;
        v_prev := v_cum;
        v_backfilled := v_backfilled + 1;
      END LOOP;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'already_confirmed', false,
    'price_paid',        v_pkg.price_paid,
    'pulses_used',       v_pkg.pulses_used,
    'pulses_remaining',  v_pkg.pulses_remaining,
    'recognition_rows',  v_backfilled
  );
END;
$$;

-- Same exposure rule as consume_package_pulses: a mutating function must not be reachable with the anon key.
REVOKE ALL ON FUNCTION public.confirm_historical_package_price(uuid, numeric, integer, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_historical_package_price(uuid, numeric, integer, uuid)
  TO service_role;
