CREATE TABLE IF NOT EXISTS public.package_revenue_recognitions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_package_id      uuid NOT NULL REFERENCES public.customer_packages(id) ON DELETE CASCADE,
  customer_package_item_id uuid NOT NULL REFERENCES public.customer_package_items(id) ON DELETE CASCADE,
  reservation_id           uuid NOT NULL REFERENCES public.reservations(id) ON DELETE RESTRICT,
  recognised_at            timestamptz NOT NULL DEFAULT now(),
  recognised_amount        numeric NOT NULL CHECK (recognised_amount >= 0),
  reason                   text NOT NULL DEFAULT 'session'
                           CHECK (reason IN ('session', 'expiry_breakage')),
  recognised_by_employee_id uuid REFERENCES public.employee_accounts(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_package_item_id, reservation_id)
);

CREATE INDEX IF NOT EXISTS package_revenue_recognitions_customer_package_id_idx
  ON public.package_revenue_recognitions (customer_package_id);
CREATE INDEX IF NOT EXISTS package_revenue_recognitions_reservation_id_idx
  ON public.package_revenue_recognitions (reservation_id);

ALTER TABLE public.package_revenue_recognitions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_customer_package_session(
  p_customer_package_item_id uuid,
  p_reservation_id uuid,
  p_employee_id uuid
)
RETURNS TABLE (
  recognition_id uuid,
  customer_package_id uuid,
  qty_used integer,
  qty_remaining integer,
  recognised_amount numeric,
  package_status text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_customer_package_id uuid;
  v_price_paid numeric;
  v_status text;
  v_expires_at timestamptz;
  v_total_sessions integer;
  v_total_used_before integer;
  v_total_used_after integer;
  v_old_recognised numeric;
  v_new_recognised numeric;
  v_recognition_id uuid;
BEGIN
  SELECT cpi.customer_package_id, cp.price_paid, cp.status, cp.expires_at
    INTO v_customer_package_id, v_price_paid, v_status, v_expires_at
  FROM public.customer_package_items cpi
  JOIN public.customer_packages cp ON cp.id = cpi.customer_package_id
  WHERE cpi.id = p_customer_package_item_id
  FOR UPDATE OF cpi, cp;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer package item not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Customer package is not active' USING ERRCODE = 'P0001';
  END IF;
  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RAISE EXCEPTION 'Customer package has expired' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.package_revenue_recognitions
    WHERE package_revenue_recognitions.customer_package_item_id = p_customer_package_item_id
      AND package_revenue_recognitions.reservation_id = p_reservation_id
  ) THEN
    RAISE EXCEPTION 'This reservation has already consumed the package item' USING ERRCODE = '23505';
  END IF;

  PERFORM 1
  FROM public.customer_package_items AS cpi
  WHERE cpi.customer_package_id = v_customer_package_id
  FOR UPDATE;

  SELECT COALESCE(SUM(cpi.qty_total), 0), COALESCE(SUM(cpi.qty_used), 0)
    INTO v_total_sessions, v_total_used_before
  FROM public.customer_package_items AS cpi
  WHERE cpi.customer_package_id = v_customer_package_id;

  IF v_total_sessions <= 0 THEN
    RAISE EXCEPTION 'Customer package has no sessions' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.customer_package_items AS cpi
  SET qty_used = cpi.qty_used + 1,
      qty_remaining = cpi.qty_remaining - 1
  WHERE cpi.id = p_customer_package_item_id
    AND cpi.qty_remaining > 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No sessions remain for this package item' USING ERRCODE = 'P0001';
  END IF;

  v_total_used_after := v_total_used_before + 1;
  v_old_recognised := round(round(v_price_paid / v_total_sessions, 2) * v_total_used_before, 2);
  v_new_recognised := least(
    round(v_price_paid, 2),
    round(round(v_price_paid / v_total_sessions, 2) * v_total_used_after, 2)
  );
  recognised_amount := v_new_recognised - v_old_recognised;

  INSERT INTO public.package_revenue_recognitions (
    customer_package_id,
    customer_package_item_id,
    reservation_id,
    recognised_amount,
    recognised_by_employee_id
  ) VALUES (
    v_customer_package_id,
    p_customer_package_item_id,
    p_reservation_id,
    recognised_amount,
    p_employee_id
  ) RETURNING id INTO v_recognition_id;

  SELECT cpi.qty_remaining INTO qty_remaining
  FROM public.customer_package_items AS cpi
  WHERE cpi.id = p_customer_package_item_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.customer_package_items AS cpi
    WHERE cpi.customer_package_id = v_customer_package_id
      AND cpi.qty_remaining > 0
  ) THEN
    v_status := 'fully_used';
    UPDATE public.customer_packages
    SET status = v_status
    WHERE id = v_customer_package_id;
  END IF;

  recognition_id := v_recognition_id;
  customer_package_id := v_customer_package_id;
  package_status := v_status;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_customer_package_session(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_customer_package_session(uuid, uuid, uuid) TO service_role;
