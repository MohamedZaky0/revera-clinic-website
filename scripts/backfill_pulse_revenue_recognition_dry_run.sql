-- DRY RUN for backfill_pulse_revenue_recognition.sql (DEC-088): SELECT only, writes nothing.
-- Lists every pulse usage row that would get a revenue recognition, with the amount, and why others are skipped.
-- The amount formula mirrors public.recognise_pulse_usage(): T(before + qty) - T(before) with
-- T(n) = least(price_paid, round(price_paid * n / total_pulses, 2)); `before` counts ALL earlier usage rows of the
-- package in (created_at, id) order. Do NOT make a dry run by calling the catch-up function: it writes.
with usage as (
  select
    u.id                    as usage_id,
    u.customer_package_id,
    u.reservation_id,
    u.quantity_used,
    u.created_at,
    cp.price_paid,
    cp.total_pulses,
    cp.price_pending,
    coalesce(sum(u.quantity_used) over (
      partition by u.customer_package_id order by u.created_at, u.id
      rows between unbounded preceding and 1 preceding), 0) as before
  from package_pulse_usage u
  join customer_packages cp on cp.id = u.customer_package_id
)
select
  usage_id, customer_package_id, reservation_id, quantity_used, created_at::date as used_on, price_paid, total_pulses,
  case
    when exists (select 1 from package_revenue_recognitions r where r.package_pulse_usage_id = usage.usage_id) then 'SKIP (already recognised)'
    when reservation_id is null then 'SKIP (no booking - stays deferred until linked)'
    when price_pending then 'SKIP (price pending)'
    when coalesce(price_paid, 0) <= 0 or coalesce(total_pulses, 0) <= 0 then 'SKIP (no price / no quota)'
    else 'WOULD RECOGNISE'
  end as action,
  case when reservation_id is not null and not price_pending and coalesce(price_paid, 0) > 0 and coalesce(total_pulses, 0) > 0
       then least(round(price_paid, 2), round(price_paid * (before + quantity_used) / total_pulses, 2))
          - least(round(price_paid, 2), round(price_paid * before / total_pulses, 2)) end as amount
from usage
order by customer_package_id, created_at, usage_id;
