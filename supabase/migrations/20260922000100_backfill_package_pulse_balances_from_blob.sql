-- 20260922000100_backfill_package_pulse_balances_from_blob.sql
--
-- Brief 34B item 6 / RISK-096: one-time backfill from the page_settings
-- 'customer_package_pulses' JSON blob onto the real customer_packages columns +
-- package_pulse_usage rows.
--
-- Rules:
--   * The blob WINS unconditionally — it was the live source of truth while the native
--     columns were written best-effort (and depletion writes were rejected wholesale by the
--     'completed' status CHECK violation, so native rows are stale exactly for exhausted
--     packages).
--   * Rows already touched by the new code (i.e. that have package_pulse_usage rows) are
--     skipped — the migration is safe to run before the deploy and safe to re-run.
--   * remaining = 0 marks the row 'fully_used', which also repairs packages the CHECK
--     violation left 'active' after depletion.
--   * Anything unresolvable is listed via RAISE NOTICE, one line per customer_packages.id,
--     and left alone — never a guessed total.
--   * The page_settings row is NOT deleted — it is the rollback.
--
-- Run immediately before deploying the column-reading code, while reception is not
-- checking out. Idempotent: safe to re-run. NOT APPLIED BY THE ASSISTANT.

DO $$
DECLARE
  v_store           jsonb;
  v_cp              record;
  v_entry           jsonb;
  v_hist            jsonb;
  v_included        integer;
  v_used            integer;
  v_remaining       integer;
  v_reservation     uuid;
  v_qty             integer;
  v_remaining_after integer;
  v_used_at         timestamptz;
BEGIN
  SELECT ps.value INTO v_store
    FROM public.page_settings ps
   WHERE ps.key = 'customer_package_pulses';

  IF v_store IS NULL OR jsonb_typeof(v_store) <> 'object' THEN
    v_store := '{}'::jsonb;
  END IF;

  FOR v_cp IN SELECT * FROM public.customer_packages LOOP
    -- Never overwrite a balance the new RPC has already moved.
    IF EXISTS (
      SELECT 1 FROM public.package_pulse_usage u WHERE u.customer_package_id = v_cp.id
    ) THEN
      CONTINUE;
    END IF;

    v_entry := v_store -> (v_cp.id::text);

    IF v_entry IS NULL OR jsonb_typeof(v_entry) <> 'object' THEN
      IF v_cp.package_type = 'pulses' AND COALESCE(v_cp.total_pulses, 0) <= 0 THEN
        RAISE NOTICE 'customer_packages %: pulses package with no pulse-store entry and no total_pulses — set Total Pulses in Admin → Packages', v_cp.id;
      END IF;
      CONTINUE;
    END IF;

    v_included := CASE
      WHEN COALESCE(v_entry->>'included_pulses', '') ~ '^\d+$'
        THEN (v_entry->>'included_pulses')::integer
      ELSE NULL END;
    v_used := CASE
      WHEN COALESCE(v_entry->>'used_pulses', '') ~ '^\d+$'
        THEN (v_entry->>'used_pulses')::integer
      ELSE 0 END;
    v_remaining := CASE
      WHEN COALESCE(v_entry->>'remaining_pulses', '') ~ '^\d+$'
        THEN (v_entry->>'remaining_pulses')::integer
      WHEN v_included IS NOT NULL THEN greatest(v_included - v_used, 0)
      ELSE NULL END;

    IF v_included IS NULL AND v_remaining IS NULL THEN
      RAISE NOTICE 'customer_packages %: malformed pulse-store entry — not backfilled', v_cp.id;
      CONTINUE;
    END IF;

    v_remaining := COALESCE(v_remaining, 0);

    UPDATE public.customer_packages
       SET total_pulses     = COALESCE(v_included, total_pulses),
           pulses_used      = v_used,
           pulses_remaining = v_remaining,
           status           = CASE WHEN v_remaining <= 0 THEN 'fully_used' ELSE status END
     WHERE id = v_cp.id;

    IF jsonb_typeof(v_entry->'usage_history') = 'array' THEN
      FOR v_hist IN SELECT * FROM jsonb_array_elements(v_entry->'usage_history') LOOP
        v_reservation := CASE
          WHEN COALESCE(v_hist->>'booking_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN (v_hist->>'booking_id')::uuid
          ELSE NULL END;
        v_qty := CASE
          WHEN COALESCE(v_hist->>'quantity_used', '') ~ '^\d+$'
            THEN (v_hist->>'quantity_used')::integer
          ELSE 0 END;
        v_remaining_after := CASE
          WHEN COALESCE(v_hist->>'remaining_after', '') ~ '^\d+$'
            THEN (v_hist->>'remaining_after')::integer
          ELSE v_remaining END;
        BEGIN
          v_used_at := (v_hist->>'used_at')::timestamptz;
        EXCEPTION WHEN OTHERS THEN
          v_used_at := now();
        END;

        INSERT INTO public.package_pulse_usage
          (customer_package_id, reservation_id, quantity_used, remaining_after,
           used_by, treatment_area, notes, created_at)
        VALUES
          (v_cp.id, v_reservation, v_qty, v_remaining_after,
           v_hist->>'used_by', v_hist->>'treatment_area', v_hist->>'notes', v_used_at)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END $$;
