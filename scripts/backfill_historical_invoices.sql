-- One-time backfill: give historical bookings (added through POST /api/reservations/previous) the
-- invoice + payment rows they never got, so the ledger-derived customer figures
-- (src/lib/customerBalances.ts, GET /api/customers/reconcile) agree with customers.spent_amount /
-- outstanding for them.
--
-- Run as ONE statement with `supabase db query -f`. Idempotent: skips any reservation that already
-- has an invoice. Writes NO `transactions` rows — the previous-bookings route already recorded the
-- cash side there; adding another would double-count cash.
--
-- Invoice total: "[Invoice Total]: N EGP" in reception_notes if present, else amount_paid + amount_left.
-- Bookings whose total is 0 are skipped (nothing to value). Every row is flagged is_opening = true
-- (DEC-024 import flag) so reports can exclude backfilled history.
-- DRY RUN: replace the final `select count(*) ...` with `select * from cand order by date`.
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
),
priced as materialized (
  select c.*, nextval('invoice_no_seq') as seq
  from cand c
  where c.total > 0
),
ins_inv as (
  insert into invoices (invoice_no, reservation_id, customer_id, branch_id, issued_at,
                        subtotal, discount_total, grand_total, status, is_opening)
  select 'INV-' || lpad(p.seq::text, 6, '0'), p.reservation_id, p.customer_id, p.branch_id,
         p.completed_at, p.total, 0, p.total, 'issued', true
  from priced p
  returning id, reservation_id
),
ins_line as (
  insert into invoice_lines (invoice_id, line_type, service_id, description, qty, unit_price,
                             discount, tax_rate, line_total)
  select i.id,
         case when p.has_pkg then 'package' when p.has_prod and p.service_id is null then 'product' else 'service' end,
         case when p.has_pkg or (p.has_prod and p.service_id is null) then null else p.service_id end,
         coalesce(p.descr, 'Historical booking') || ' [historical backfill]',
         1, p.total, 0, 0, p.total
  from ins_inv i join priced p on p.reservation_id = i.reservation_id
  returning 1
),
ins_pay as (
  insert into payments (invoice_id, received_at, amount, method, reference, is_opening)
  select i.id, p.completed_at, p.paid,
         case when p.pm ~ 'card|visa|mastercard' then 'card'
              when p.pm like '%instapay%' then 'instapay'
              when p.pm like '%wallet%' then 'wallet'
              when p.pm like '%transfer%' then 'transfer'
              else 'cash' end,
         'historical backfill', true
  from ins_inv i join priced p on p.reservation_id = i.reservation_id
  where p.paid > 0
  returning 1
)
select (select count(*) from ins_inv) as invoices_created,
       (select count(*) from ins_line) as lines_created,
       (select count(*) from ins_pay) as payments_created,
       (select count(*) from cand where total <= 0) as skipped_zero_total;
