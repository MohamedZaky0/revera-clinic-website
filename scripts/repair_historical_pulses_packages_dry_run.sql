-- DRY RUN for repair_historical_pulses_packages.sql (DEC-088 item 6): SELECT only, writes nothing.
-- Lists customer packages that came from POST /api/reservations/previous before it read the catalog: the catalog says
-- 'pulses' but the patient's package is typed 'services' with no items and no quota.
select cp.id as customer_package_id, cp.customer_id, left(p.name, 30) as catalog_name,
       cp.package_type as current_type, cp.total_pulses as current_total, p.total_pulses as catalog_total,
       cp.price_paid as current_price_paid, p.price as catalog_price, cp.price_pending,
       case when coalesce(p.total_pulses, 0) > 0 then 'WOULD REPAIR' else 'WOULD REPAIR (catalog quota is 0 - stays unconfigured)' end as action
from public.customer_packages cp
join public.packages p on p.id = cp.package_id
where p.package_type = 'pulses'
  and cp.package_type = 'services'
  and not exists (select 1 from public.customer_package_items i where i.customer_package_id = cp.id)
  and not exists (select 1 from public.package_pulse_usage u where u.customer_package_id = cp.id)
order by cp.created_at;
