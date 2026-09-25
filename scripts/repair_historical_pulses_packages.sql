-- One-time repair (DEC-088 item 6): historical packages added through POST /api/reservations/previous before it
-- read the catalog were stored as package_type 'services' with total_pulses 0 (so their pulses could not be tracked
-- or consumed) and price_paid = the CATALOG price. For each such package whose catalog package is a pulses package:
--   * type -> 'pulses', quota -> the catalog total_pulses, balance -> the full quota (the pulses the patient already
--     used before the clinic went live are unknown; staff adjust that if needed);
--   * price -> PENDING (price_pending = true, price_paid = 0): the catalog price was never what the patient paid, and
--     these bookings had no invoice value entered. Staff enter the real value later (DEC-088 item 6).
-- Idempotent: only touches packages still typed 'services' with no items and no usage. Run as ONE statement:
--   npx supabase db query --linked [--project-ref <ref>] -f scripts/repair_historical_pulses_packages.sql
-- ALWAYS run repair_historical_pulses_packages_dry_run.sql first (SELECT only).
update public.customer_packages cp
   set package_type     = 'pulses',
       total_pulses     = greatest(0, p.total_pulses),
       pulses_used      = 0,
       pulses_remaining = greatest(0, p.total_pulses),
       price_paid       = 0,
       price_pending    = true
  from public.packages p
 where p.id = cp.package_id
   and p.package_type = 'pulses'
   and cp.package_type = 'services'
   and not exists (select 1 from public.customer_package_items i where i.customer_package_id = cp.id)
   and not exists (select 1 from public.package_pulse_usage u where u.customer_package_id = cp.id)
returning cp.id as customer_package_id, cp.package_type, cp.total_pulses, cp.pulses_remaining, cp.price_paid, cp.price_pending;
