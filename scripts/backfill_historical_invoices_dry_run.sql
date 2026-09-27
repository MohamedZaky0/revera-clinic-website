-- DRY RUN for backfill_historical_invoices.sql: SELECT only, writes nothing.
-- Lists every historical booking that would get an invoice (total > 0) or be skipped (total = 0).
-- Do NOT make a dry run by editing the final SELECT of the real script: Postgres executes
-- data-modifying CTEs even when the final SELECT does not reference them, so that "dry run" WRITES.
with cand as materialized (
  select
    r.id                                   as reservation_id,
    r.customer_id,
    r.branch_id,
    r.service_id,
    r.completed_at,
    coalesce(r.amount_paid, 0)::numeric    as paid,
    coalesce(
      nullif((regexp_match(r.reception_notes, '\[Invoice Total\]: ([0-9]+(?:\.[0-9]+)?) EGP'))[1], '')::numeric,
      coalesce(r.amount_paid, 0) + coalesce(r.amount_left, 0)
    )                                      as total,
    nullif(concat_ws(', ',
      (regexp_match(r.reception_notes, 'Service: ([^.]+)\.'))[1],
      case when (regexp_match(r.reception_notes, 'Package: ([^.]+)\.'))[1] is not null
           then 'Package: ' || (regexp_match(r.reception_notes, 'Package: ([^.]+)\.'))[1] end,
      case when (regexp_match(r.reception_notes, 'Product: ([^.]+)\.'))[1] is not null
           then 'Product: ' || (regexp_match(r.reception_notes, 'Product: ([^.]+)\.'))[1] end
    ), '')                                 as descr,
    (regexp_match(r.reception_notes, 'Package: ([^.]+)\.'))[1] is not null as has_pkg,
    (regexp_match(r.reception_notes, 'Product: ([^.]+)\.'))[1] is not null as has_prod,
    lower(coalesce((regexp_match(r.reception_notes, 'Payment Method: ([^.]+)\.'))[1], '')) as pm,
    r.date
  from reservations r
  where r.is_historical is true
    and r.status = 'completed'
    and r.customer_id is not null
    and not exists (select 1 from invoices i where i.reservation_id = r.id)
)
select reservation_id, date, left(descr, 40) as descr, paid, total, pm, has_pkg, has_prod, service_id,
       case when total > 0 then 'WOULD CREATE' else 'SKIP (zero)' end as action
from cand order by date;
