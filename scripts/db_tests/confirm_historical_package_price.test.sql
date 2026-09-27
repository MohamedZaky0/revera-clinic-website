-- Repeatable database test for DEC-088 item 6 (migration 20260925010000_confirm_historical_package_price.sql).
--   npx supabase db query --linked -f scripts/db_tests/confirm_historical_package_price.test.sql
-- One transaction that is ALWAYS rolled back: ends with 'PASS: <n> assertions (rolled back)' or 'FAIL: <what>'.
-- Requires the pulse-revenue migration (20260925000000) as well. Run on dev until applied elsewhere.
DO $test$
DECLARE
  n int := 0;
  v_branch uuid; v_catalog uuid; v_service bigint;
  v_cust uuid := gen_random_uuid();
  v_pkg uuid; v_item uuid;
  r jsonb; v_msg text; v_amt numeric; v_cnt int;
  res uuid[] := ARRAY[]::uuid[];
  i int;
BEGIN
  EXECUTE $f$
    CREATE OR REPLACE FUNCTION pg_temp.c(p uuid, q int, rsv uuid) RETURNS jsonb LANGUAGE plpgsql AS $g$
    DECLARE r jsonb; k int;
    BEGIN
      r := public.consume_package_pulses(p, q, rsv, 't');
      SELECT count(*) INTO k FROM public.package_pulse_usage WHERE customer_package_id = p AND reservation_id IS NOT NULL;
      UPDATE public.package_pulse_usage SET created_at = now() - interval '1 hour' + k * interval '1 second'
       WHERE customer_package_id = p AND created_at = now();
      RETURN r;
    END $g$;
  $f$;

  SELECT id INTO v_branch  FROM branches LIMIT 1;
  SELECT id INTO v_catalog FROM packages LIMIT 1;
  SELECT id INTO v_service FROM services LIMIT 1;
  INSERT INTO customers (id, name, mobile, spent_amount, outstanding, wallet_balance, number_of_bookings)
  VALUES (v_cust, 'ZZ CONFIRM TEST', '01000000555', 0, 0, 0, 0);
  FOR i IN 1..8 LOOP
    res := res || gen_random_uuid();
    INSERT INTO reservations (id, customer_id, name, phone, date, time_slot, requested_time, status, is_manual, service_ids, doctor_name, branch_id)
    VALUES (res[i], v_cust, 'ZZ CONFIRM TEST', '01000000555', '2026-09-25', '12:00', 'x', 'completed', true, '{}', '-', v_branch);
  END LOOP;

  -- ===== C1: pending pulses package; confirm price 5,000 with 3,000 pulses already used before launch =====
  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at, price_pending, purchased_at)
  VALUES (v_pkg, v_cust, v_catalog, 0, 'active', 'pulses', 10000, 0, 10000, now() + interval '1 year', true, '2026-04-16T12:00:00Z');
  r := public.confirm_historical_package_price(v_pkg, 5000, 3000, NULL);
  n := n + 1; IF (r->>'price_paid')::numeric <> 5000 OR (r->>'pulses_used')::int <> 3000 OR (r->>'pulses_remaining')::int <> 7000 OR (r->>'already_confirmed')::boolean THEN RAISE EXCEPTION 'FAIL C1a %', r; END IF;
  n := n + 1; IF (SELECT price_pending FROM customer_packages WHERE id = v_pkg) THEN RAISE EXCEPTION 'FAIL C1b still pending'; END IF;
  n := n + 1; IF (SELECT count(*) FROM package_pulse_usage WHERE customer_package_id = v_pkg AND reservation_id IS NULL AND quantity_used = 3000 AND remaining_after = 7000 AND created_at = '2026-04-16T12:00:00Z') <> 1 THEN RAISE EXCEPTION 'FAIL C1c pre-launch usage row'; END IF;
  n := n + 1; IF (SELECT count(*) FROM package_revenue_recognitions WHERE customer_package_id = v_pkg) <> 0 THEN RAISE EXCEPTION 'FAIL C1d pre-launch pulses must not recognise revenue'; END IF;

  -- ===== C2: a real consume afterwards is worth only ITS range: T(4000) - T(3000) = 2000 - 1500 = 500.00 =====
  r := pg_temp.c(v_pkg, 1000, res[1]);
  n := n + 1; IF (r->>'recognised')::numeric <> 500.00 THEN RAISE EXCEPTION 'FAIL C2 recognised %', r; END IF;

  -- ===== C3: idempotency / refusal =====
  r := public.confirm_historical_package_price(v_pkg, 5000, 0, NULL);
  n := n + 1; IF (r->>'already_confirmed')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'FAIL C3a same-price replay %', r; END IF;
  BEGIN PERFORM public.confirm_historical_package_price(v_pkg, 4000, 0, NULL); v_msg := 'NO ERROR'; EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
  n := n + 1; IF v_msg NOT LIKE '%already confirmed%' THEN RAISE EXCEPTION 'FAIL C3b different price: %', v_msg; END IF;

  -- ===== C4: validation =====
  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at, price_pending)
  VALUES (v_pkg, v_cust, v_catalog, 0, 'active', 'pulses', 100, 0, 100, now() + interval '1 year', true);
  BEGIN PERFORM public.confirm_historical_package_price(v_pkg, 500, 101, NULL); v_msg := 'NO ERROR'; EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
  n := n + 1; IF v_msg NOT LIKE '%exceeds the remaining%' THEN RAISE EXCEPTION 'FAIL C4a: %', v_msg; END IF;
  BEGIN PERFORM public.confirm_historical_package_price(v_pkg, -1, 0, NULL); v_msg := 'NO ERROR'; EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
  n := n + 1; IF v_msg NOT LIKE '%zero or more%' THEN RAISE EXCEPTION 'FAIL C4b: %', v_msg; END IF;
  BEGIN PERFORM public.confirm_historical_package_price(v_pkg, 500, -5, NULL); v_msg := 'NO ERROR'; EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
  n := n + 1; IF v_msg NOT LIKE '%zero or more%' THEN RAISE EXCEPTION 'FAIL C4c: %', v_msg; END IF;
  BEGIN PERFORM public.confirm_historical_package_price(gen_random_uuid(), 500, 0, NULL); v_msg := 'NO ERROR'; EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
  n := n + 1; IF v_msg NOT LIKE '%not found%' THEN RAISE EXCEPTION 'FAIL C4d: %', v_msg; END IF;
  n := n + 1; IF (SELECT price_pending FROM customer_packages WHERE id = v_pkg) IS NOT TRUE THEN RAISE EXCEPTION 'FAIL C4e a refused confirm must change nothing'; END IF;

  -- ===== C5: consumed WHILE pending (recognised 0), then confirmed: the catch-up recognises it =====
  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at, price_pending, purchased_at)
  VALUES (v_pkg, v_cust, v_catalog, 0, 'active', 'pulses', 10000, 0, 10000, now() + interval '1 year', true, '2026-04-16T12:00:00Z');
  r := pg_temp.c(v_pkg, 1000, res[2]);
  n := n + 1; IF (r->>'recognised')::numeric <> 0 THEN RAISE EXCEPTION 'FAIL C5a pending consume %', r; END IF;
  r := public.confirm_historical_package_price(v_pkg, 5000, 0, NULL);
  n := n + 1; IF (r->>'recognition_rows')::int <> 1 THEN RAISE EXCEPTION 'FAIL C5b catch-up rows %', r; END IF;
  SELECT sum(recognised_amount) INTO v_amt FROM package_revenue_recognitions WHERE customer_package_id = v_pkg;
  n := n + 1; IF v_amt <> 500.00 THEN RAISE EXCEPTION 'FAIL C5c recognised %', v_amt; END IF;

  -- ===== C6: all remaining pulses were used before launch -> fully_used =====
  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at, price_pending)
  VALUES (v_pkg, v_cust, v_catalog, 0, 'active', 'pulses', 2500, 0, 2500, now() + interval '1 year', true);
  PERFORM public.confirm_historical_package_price(v_pkg, 2000, 2500, NULL);
  n := n + 1; IF (SELECT status FROM customer_packages WHERE id = v_pkg) <> 'fully_used' OR (SELECT pulses_remaining FROM customer_packages WHERE id = v_pkg) <> 0 THEN RAISE EXCEPTION 'FAIL C6 status'; END IF;

  -- ===== C7: a SERVICES package consumed while pending recorded a zero recognition; confirming re-derives it =====
  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at, price_pending)
  VALUES (v_pkg, v_cust, v_catalog, 0, 'active', 'services', 0, 0, 0, now() + interval '1 year', true);
  v_item := gen_random_uuid();
  INSERT INTO customer_package_items (id, customer_package_id, service_id, qty_total, qty_used, qty_remaining) VALUES (v_item, v_pkg, v_service, 3, 0, 3);
  PERFORM * FROM public.consume_customer_package_session(v_item, res[3], NULL);
  SELECT recognised_amount INTO v_amt FROM package_revenue_recognitions WHERE customer_package_item_id = v_item;
  n := n + 1; IF v_amt <> 0 THEN RAISE EXCEPTION 'FAIL C7a pending services recognition = %', v_amt; END IF;
  r := public.confirm_historical_package_price(v_pkg, 600, 0, NULL);
  SELECT recognised_amount INTO v_amt FROM package_revenue_recognitions WHERE customer_package_item_id = v_item;
  n := n + 1; IF v_amt <> 200.00 THEN RAISE EXCEPTION 'FAIL C7b services re-derived = %', v_amt; END IF;
  PERFORM * FROM public.consume_customer_package_session(v_item, res[4], NULL);
  PERFORM * FROM public.consume_customer_package_session(v_item, res[5], NULL);
  SELECT sum(recognised_amount) INTO v_amt FROM package_revenue_recognitions WHERE customer_package_item_id = v_item;
  n := n + 1; IF v_amt <> 600.00 THEN RAISE EXCEPTION 'FAIL C7c services total at depletion = %', v_amt; END IF;

  -- ===== C8: pulses cannot be entered for a services package =====
  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at, price_pending)
  VALUES (v_pkg, v_cust, v_catalog, 0, 'active', 'services', 0, 0, 0, now() + interval '1 year', true);
  BEGIN PERFORM public.confirm_historical_package_price(v_pkg, 600, 5, NULL); v_msg := 'NO ERROR'; EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
  n := n + 1; IF v_msg NOT LIKE '%services package%' THEN RAISE EXCEPTION 'FAIL C8: %', v_msg; END IF;

  -- ===== C9: ACL =====
  n := n + 1; IF has_function_privilege('anon', 'public.confirm_historical_package_price(uuid,numeric,integer,uuid)', 'EXECUTE')
             OR has_function_privilege('authenticated', 'public.confirm_historical_package_price(uuid,numeric,integer,uuid)', 'EXECUTE')
             OR NOT has_function_privilege('service_role', 'public.confirm_historical_package_price(uuid,numeric,integer,uuid)', 'EXECUTE')
     THEN RAISE EXCEPTION 'FAIL C9 ACL'; END IF;

  RAISE EXCEPTION 'PASS: % assertions (rolled back)', n;
END
$test$;
