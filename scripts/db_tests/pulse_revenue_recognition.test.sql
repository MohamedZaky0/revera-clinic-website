-- Repeatable database test for DEC-088 (migration 20260925000000_pulse_revenue_recognition.sql).
-- The in-memory supabaseFake cannot run PL/pgSQL, so this runs against a real database:
--   npx supabase db query --linked -f scripts/db_tests/pulse_revenue_recognition.test.sql
-- Everything happens inside one transaction that is ALWAYS rolled back: the final statement raises
-- 'PASS: <n> assertions (rolled back)' on success, or 'FAIL: <what>' at the first broken assertion. Nothing is left behind.
-- Concurrency cannot be exercised inside one transaction; see PULSE_REVENUE_RECOGNITION_MANUAL_TESTS.md.
-- Run on dev only until the migration is applied elsewhere.
DO $test$
DECLARE
  n int := 0;
  v_branch   uuid;
  v_catalog  uuid;
  v_service  bigint;
  v_cust     uuid := gen_random_uuid();
  v_pkg      uuid;
  v_pkg2     uuid;
  v_item     uuid;
  r          jsonb;
  res        uuid[] := ARRAY[]::uuid[];
  i          int;
  v_amt      numeric;
  v_cnt      int;
  v_msg      text;
  v_usage    uuid;

BEGIN
  -- ---------- helpers via local functions are unavailable in DO; use inline checks ----------
  -- Inside one transaction now() never changes, so every usage row would tie on created_at and the (created_at, id)
  -- order would be random. This helper consumes, then re-stamps the new row into the past in call order so the
  -- order is chronological exactly as it is in production (separate transactions).
  EXECUTE $f$
    CREATE OR REPLACE FUNCTION pg_temp.c(p uuid, q int, rsv uuid) RETURNS jsonb LANGUAGE plpgsql AS $g$
    DECLARE r jsonb; k int;
    BEGIN
      r := public.consume_package_pulses(p, q, rsv, 't');
      SELECT count(*) INTO k FROM public.package_pulse_usage WHERE customer_package_id = p;
      UPDATE public.package_pulse_usage SET created_at = now() - interval '2 hours' + k * interval '1 second'
       WHERE customer_package_id = p AND created_at = now();
      RETURN r;
    END $g$;
  $f$;

  SELECT id INTO v_branch  FROM branches LIMIT 1;
  SELECT id INTO v_catalog FROM packages LIMIT 1;
  SELECT id INTO v_service FROM services LIMIT 1;

  INSERT INTO customers (id, name, mobile, spent_amount, outstanding, wallet_balance, number_of_bookings)
  VALUES (v_cust, 'ZZ DB TEST', '01000000777', 0, 0, 0, 0);

  FOR i IN 1..20 LOOP
    res := res || gen_random_uuid();
    INSERT INTO reservations (id, customer_id, name, phone, date, time_slot, requested_time, status, is_manual, service_ids, doctor_name, branch_id)
    VALUES (res[i], v_cust, 'ZZ DB TEST', '01000000777', '2026-09-25', '12:00', 'x', 'completed', true, '{}', '-', v_branch);
  END LOOP;

  -- ===== T1: 5,000 EGP over 3,000 pulses, three linked consumes -> 1666.67 / 1666.66 / 1666.67 = 5000.00 =====
  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at)
  VALUES (v_pkg, v_cust, v_catalog, 5000, 'active', 'pulses', 3000, 0, 3000, now() + interval '1 year');

  r := pg_temp.c(v_pkg, 1000, res[1]);
  n := n + 1; IF (r->>'recognised')::numeric <> 1666.67 THEN RAISE EXCEPTION 'FAIL T1a first share: %', r; END IF;
  r := pg_temp.c(v_pkg, 1000, res[2]);
  n := n + 1; IF (r->>'recognised')::numeric <> 1666.66 THEN RAISE EXCEPTION 'FAIL T1b second share: %', r; END IF;
  r := pg_temp.c(v_pkg, 1000, res[3]);
  n := n + 1; IF (r->>'recognised')::numeric <> 1666.67 THEN RAISE EXCEPTION 'FAIL T1c third share: %', r; END IF;
  SELECT coalesce(sum(recognised_amount),0) INTO v_amt FROM package_revenue_recognitions WHERE customer_package_id = v_pkg;
  n := n + 1; IF v_amt <> 5000.00 THEN RAISE EXCEPTION 'FAIL T1d sum at depletion = %', v_amt; END IF;
  n := n + 1; IF (SELECT status FROM customer_packages WHERE id = v_pkg) <> 'fully_used' THEN RAISE EXCEPTION 'FAIL T1e status'; END IF;
  n := n + 1; IF (SELECT count(*) FROM package_revenue_recognitions WHERE customer_package_id = v_pkg AND reservation_id IS NOT NULL AND recognised_at IS NOT NULL AND reason = 'session') <> 3 THEN RAISE EXCEPTION 'FAIL T1f rows'; END IF;

  -- ===== T2: replay the same booking recognises nothing twice =====
  r := pg_temp.c(v_pkg, 1000, res[1]);
  n := n + 1; IF (r->>'already_deducted')::boolean IS NOT TRUE OR (r->>'recognised')::numeric <> 0 THEN RAISE EXCEPTION 'FAIL T2 replay: %', r; END IF;
  SELECT count(*) INTO v_cnt FROM package_revenue_recognitions WHERE customer_package_id = v_pkg;
  n := n + 1; IF v_cnt <> 3 THEN RAISE EXCEPTION 'FAIL T2 rows after replay = %', v_cnt; END IF;

  -- ===== T3: awkward rounding: 1,000 EGP over 3 pulses -> 333.33 / 333.34 / 333.33 (T(1)=333.33, T(2)=666.67, T(3)=1000) =====
  v_pkg2 := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at)
  VALUES (v_pkg2, v_cust, v_catalog, 1000, 'active', 'pulses', 3, 0, 3, now() + interval '1 year');
  r := pg_temp.c(v_pkg2, 1, res[4]); v_amt := (r->>'recognised')::numeric;
  n := n + 1; IF v_amt <> 333.33 THEN RAISE EXCEPTION 'FAIL T3a %', v_amt; END IF;
  r := pg_temp.c(v_pkg2, 1, res[5]);
  n := n + 1; IF (r->>'recognised')::numeric <> 333.34 THEN RAISE EXCEPTION 'FAIL T3b %', r; END IF;
  r := pg_temp.c(v_pkg2, 1, res[6]);
  n := n + 1; IF (r->>'recognised')::numeric <> 333.33 THEN RAISE EXCEPTION 'FAIL T3c %', r; END IF;
  SELECT sum(recognised_amount) INTO v_amt FROM package_revenue_recognitions WHERE customer_package_id = v_pkg2;
  n := n + 1; IF v_amt <> 1000.00 THEN RAISE EXCEPTION 'FAIL T3d sum %', v_amt; END IF;

  -- ===== T4: consume with no booking: pulses move, nothing recognised; link it later + catch-up = exact remainder =====
  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at)
  VALUES (v_pkg, v_cust, v_catalog, 5000, 'active', 'pulses', 3000, 0, 3000, now() + interval '1 year');
  PERFORM pg_temp.c(v_pkg, 1000, res[7]);
  r := pg_temp.c(v_pkg, 500, NULL);
  n := n + 1; IF (r->>'recognised')::numeric <> 0 OR (r->>'consumed')::int <> 500 THEN RAISE EXCEPTION 'FAIL T4a orphan: %', r; END IF;
  r := pg_temp.c(v_pkg, 5000, res[8]);            -- clamps to the 1,500 remaining
  n := n + 1; IF (r->>'consumed')::int <> 1500 OR (r->>'remaining')::int <> 0 THEN RAISE EXCEPTION 'FAIL T4b clamp: %', r; END IF;
  SELECT coalesce(sum(recognised_amount),0) INTO v_amt FROM package_revenue_recognitions WHERE customer_package_id = v_pkg;
  n := n + 1; IF v_amt <> 4166.67 THEN RAISE EXCEPTION 'FAIL T4c before linking = %', v_amt; END IF;       -- 5000 - the orphan's 833.33
  UPDATE package_pulse_usage SET reservation_id = res[9] WHERE customer_package_id = v_pkg AND reservation_id IS NULL;
  n := n + 1; IF public.recognise_package_pulses_catchup(v_pkg) <> 1 THEN RAISE EXCEPTION 'FAIL T4d catch-up count'; END IF;
  SELECT sum(recognised_amount) INTO v_amt FROM package_revenue_recognitions WHERE customer_package_id = v_pkg;
  n := n + 1; IF v_amt <> 5000.00 THEN RAISE EXCEPTION 'FAIL T4e after linking = %', v_amt; END IF;
  n := n + 1; IF public.recognise_package_pulses_catchup(v_pkg) <> 0 THEN RAISE EXCEPTION 'FAIL T4f catch-up not idempotent'; END IF;

  -- ===== T5: pending price: nothing recognised; confirm + catch-up recognises everything consumed =====
  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at, price_pending)
  VALUES (v_pkg, v_cust, v_catalog, 0, 'active', 'pulses', 3000, 0, 3000, now() + interval '1 year', true);
  r := pg_temp.c(v_pkg, 1000, res[10]);
  n := n + 1; IF (r->>'recognised')::numeric <> 0 OR (r->>'consumed')::int <> 1000 THEN RAISE EXCEPTION 'FAIL T5a pending: %', r; END IF;
  UPDATE customer_packages SET price_paid = 5000, price_pending = false WHERE id = v_pkg;
  n := n + 1; IF public.recognise_package_pulses_catchup(v_pkg) <> 1 THEN RAISE EXCEPTION 'FAIL T5b catch-up'; END IF;
  SELECT sum(recognised_amount) INTO v_amt FROM package_revenue_recognitions WHERE customer_package_id = v_pkg;
  n := n + 1; IF v_amt <> 1666.67 THEN RAISE EXCEPTION 'FAIL T5c = %', v_amt; END IF;

  -- ===== T6: zero price and free package: consume works, nothing recognised =====
  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at)
  VALUES (v_pkg, v_cust, v_catalog, 0, 'active', 'pulses', 100, 0, 100, now() + interval '1 year');
  r := pg_temp.c(v_pkg, 40, res[11]);
  n := n + 1; IF (r->>'recognised')::numeric <> 0 OR (r->>'consumed')::int <> 40 THEN RAISE EXCEPTION 'FAIL T6: %', r; END IF;

  -- ===== T7: out-of-order recognition still totals price_paid (link rows in reverse, catch up once) =====
  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at)
  VALUES (v_pkg, v_cust, v_catalog, 4321, 'active', 'pulses', 900, 0, 900, now() + interval '1 year');
  PERFORM pg_temp.c(v_pkg, 300, NULL);
  PERFORM pg_temp.c(v_pkg, 300, NULL);
  PERFORM pg_temp.c(v_pkg, 300, NULL);
  n := n + 1; IF (SELECT count(*) FROM package_revenue_recognitions WHERE customer_package_id = v_pkg) <> 0 THEN RAISE EXCEPTION 'FAIL T7a unlinked recognised'; END IF;
  -- link the LAST usage first and catch up, then the others
  UPDATE package_pulse_usage SET reservation_id = res[12] WHERE id = (SELECT id FROM package_pulse_usage WHERE customer_package_id = v_pkg ORDER BY created_at DESC, id DESC LIMIT 1);
  PERFORM public.recognise_package_pulses_catchup(v_pkg);
  UPDATE package_pulse_usage SET reservation_id = res[13] WHERE customer_package_id = v_pkg AND reservation_id IS NULL AND id = (SELECT id FROM package_pulse_usage WHERE customer_package_id = v_pkg AND reservation_id IS NULL ORDER BY created_at, id LIMIT 1);
  PERFORM public.recognise_package_pulses_catchup(v_pkg);
  UPDATE package_pulse_usage SET reservation_id = res[14] WHERE customer_package_id = v_pkg AND reservation_id IS NULL;
  PERFORM public.recognise_package_pulses_catchup(v_pkg);
  SELECT sum(recognised_amount) INTO v_amt FROM package_revenue_recognitions WHERE customer_package_id = v_pkg;
  n := n + 1; IF v_amt <> 4321.00 THEN RAISE EXCEPTION 'FAIL T7b out-of-order total = %', v_amt; END IF;

  -- ===== T8: refusals keep their messages (quota not configured / expired / depleted) =====
  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at)
  VALUES (v_pkg, v_cust, v_catalog, 100, 'active', 'pulses', 0, 0, 0, now() + interval '1 year');
  BEGIN PERFORM pg_temp.c(v_pkg, 10, res[15]); v_msg := 'NO ERROR';
  EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
  n := n + 1; IF v_msg NOT LIKE '%quota is not configured%' THEN RAISE EXCEPTION 'FAIL T8a: %', v_msg; END IF;

  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at)
  VALUES (v_pkg, v_cust, v_catalog, 100, 'active', 'pulses', 100, 0, 100, now() - interval '1 day');
  BEGIN PERFORM pg_temp.c(v_pkg, 10, res[15]); v_msg := 'NO ERROR';
  EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
  n := n + 1; IF v_msg NOT LIKE '%expired%' THEN RAISE EXCEPTION 'FAIL T8b: %', v_msg; END IF;

  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at)
  VALUES (v_pkg, v_cust, v_catalog, 100, 'active', 'pulses', 10, 0, 10, now() + interval '1 year');
  PERFORM pg_temp.c(v_pkg, 10, res[16]);
  BEGIN PERFORM pg_temp.c(v_pkg, 5, res[17]); v_msg := 'NO ERROR';
  EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
  n := n + 1; IF v_msg NOT LIKE '%0 remaining pulses%' THEN RAISE EXCEPTION 'FAIL T8c: %', v_msg; END IF;
  SELECT count(*) INTO v_cnt FROM package_revenue_recognitions WHERE customer_package_id = v_pkg;
  n := n + 1; IF v_cnt <> 1 THEN RAISE EXCEPTION 'FAIL T8d refused consume left rows: %', v_cnt; END IF;

  -- ===== T9: constraints =====
  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at)
  VALUES (v_pkg, v_cust, v_catalog, 100, 'active', 'pulses', 10, 0, 10, now() + interval '1 year');
  PERFORM pg_temp.c(v_pkg, 5, res[18]);
  SELECT id INTO v_usage FROM package_pulse_usage WHERE customer_package_id = v_pkg;
  -- a session row with NEITHER source violates the CHECK
  BEGIN
    INSERT INTO package_revenue_recognitions (customer_package_id, reservation_id, recognised_amount, reason) VALUES (v_pkg, res[18], 1, 'session');
    v_msg := 'NO ERROR';
  EXCEPTION WHEN check_violation THEN v_msg := 'check_violation'; END;
  n := n + 1; IF v_msg <> 'check_violation' THEN RAISE EXCEPTION 'FAIL T9a neither source: %', v_msg; END IF;
  -- a second recognition for the same usage row violates the unique index
  BEGIN
    INSERT INTO package_revenue_recognitions (customer_package_id, package_pulse_usage_id, reservation_id, recognised_amount, reason) VALUES (v_pkg, v_usage, res[18], 1, 'session');
    v_msg := 'NO ERROR';
  EXCEPTION WHEN unique_violation THEN v_msg := 'unique_violation'; END;
  n := n + 1; IF v_msg <> 'unique_violation' THEN RAISE EXCEPTION 'FAIL T9b duplicate usage: %', v_msg; END IF;

  -- ===== T10: cascades: deleting a usage row removes its recognition; deleting a reservation removes its recognition =====
  DELETE FROM package_pulse_usage WHERE id = v_usage;
  n := n + 1; IF (SELECT count(*) FROM package_revenue_recognitions WHERE customer_package_id = v_pkg) <> 0 THEN RAISE EXCEPTION 'FAIL T10a usage cascade'; END IF;
  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at)
  VALUES (v_pkg, v_cust, v_catalog, 100, 'active', 'pulses', 10, 0, 10, now() + interval '1 year');
  PERFORM pg_temp.c(v_pkg, 5, res[19]);
  DELETE FROM reservations WHERE id = res[19];
  n := n + 1; IF (SELECT count(*) FROM package_revenue_recognitions WHERE customer_package_id = v_pkg) <> 0 THEN RAISE EXCEPTION 'FAIL T10b reservation cascade'; END IF;

  -- ===== T11: REGRESSION - a services package (items, no pulses) still recognises through the old function =====
  v_pkg := gen_random_uuid();
  INSERT INTO customer_packages (id, customer_id, package_id, price_paid, status, package_type, total_pulses, pulses_used, pulses_remaining, expires_at)
  VALUES (v_pkg, v_cust, v_catalog, 600, 'active', 'services', 0, 0, 0, now() + interval '1 year');
  v_item := gen_random_uuid();
  INSERT INTO customer_package_items (id, customer_package_id, service_id, qty_total, qty_used, qty_remaining)
  VALUES (v_item, v_pkg, v_service, 3, 0, 3);
  PERFORM * FROM public.consume_customer_package_session(v_item, res[20], NULL);
  SELECT recognised_amount INTO v_amt FROM package_revenue_recognitions WHERE customer_package_item_id = v_item AND reservation_id = res[20];
  n := n + 1; IF v_amt IS DISTINCT FROM 200.00 THEN RAISE EXCEPTION 'FAIL T11a services recognition = %', v_amt; END IF;
  n := n + 1; IF (SELECT package_pulse_usage_id FROM package_revenue_recognitions WHERE customer_package_item_id = v_item) IS NOT NULL THEN RAISE EXCEPTION 'FAIL T11b'; END IF;
  BEGIN PERFORM * FROM public.consume_customer_package_session(v_item, res[20], NULL); v_msg := 'NO ERROR';
  EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
  n := n + 1; IF v_msg NOT LIKE '%already consumed%' THEN RAISE EXCEPTION 'FAIL T11c services replay guard: %', v_msg; END IF;

  -- ===== T12: function ACL =====
  n := n + 1; IF has_function_privilege('anon', 'public.recognise_pulse_usage(uuid)', 'EXECUTE')
             OR has_function_privilege('authenticated', 'public.recognise_pulse_usage(uuid)', 'EXECUTE')
             OR has_function_privilege('anon', 'public.recognise_package_pulses_catchup(uuid)', 'EXECUTE')
             OR has_function_privilege('authenticated', 'public.recognise_package_pulses_catchup(uuid)', 'EXECUTE')
             OR has_function_privilege('anon', 'public.consume_package_pulses(uuid,integer,uuid,text,text,text)', 'EXECUTE')
             OR has_function_privilege('authenticated', 'public.consume_package_pulses(uuid,integer,uuid,text,text,text)', 'EXECUTE')
             OR NOT has_function_privilege('service_role', 'public.recognise_pulse_usage(uuid)', 'EXECUTE')
             OR NOT has_function_privilege('service_role', 'public.recognise_package_pulses_catchup(uuid)', 'EXECUTE')
             OR NOT has_function_privilege('service_role', 'public.consume_package_pulses(uuid,integer,uuid,text,text,text)', 'EXECUTE')
     THEN RAISE EXCEPTION 'FAIL T12 ACL'; END IF;

  -- Roll everything back by raising; the message carries the result.
  RAISE EXCEPTION 'PASS: % assertions (rolled back)', n;
END
$test$;
