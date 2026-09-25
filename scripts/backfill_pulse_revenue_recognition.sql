-- One-time backfill (DEC-088): recognise revenue for pulse usage rows that were consumed before
-- consume_package_pulses() started writing recognitions (migration 20260925000000_pulse_revenue_recognition.sql
-- must be applied first). Idempotent: recognise_package_pulses_catchup() skips usage rows that already have a
-- recognition, rows without a booking (their share stays deferred until linked) and packages with a pending price.
-- Run as ONE statement: npx supabase db query --linked [--project-ref <ref>] -f scripts/backfill_pulse_revenue_recognition.sql
-- ALWAYS run scripts/backfill_pulse_revenue_recognition_dry_run.sql first (SELECT only).
select count(*) as packages_processed,
       coalesce(sum(n), 0) as recognitions_created
from (
  select public.recognise_package_pulses_catchup(cp.id) as n
  from public.customer_packages cp
  where cp.package_type = 'pulses'
) x;
