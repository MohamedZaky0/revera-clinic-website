-- ============================================================================
-- DEV-ONLY: wipe every patient and every patient-linked transactional record.
-- Confirmed 2026-08-16 by the clinic owner: this is the dev Supabase project,
-- all data in it — including prices — is fake test data. Do NOT run this
-- against a database holding any real patient.
--
-- Deletes in dependency order so foreign keys never block a step:
--   1. reservations        — customer_id has no ON DELETE clause (defaults to
--                             NO ACTION), so it would block deleting customers
--                             if left in place. Also cascades to
--                             package_revenue_recognitions via reservation_id.
--   2. invoices             — cascades invoice_lines + payments. Deleting
--                             customers alone would only null invoices.customer_id,
--                             leaving fake invoices behind.
--   3. product_sales        — customer_id is ON DELETE SET NULL on customers,
--                             so it would survive a customer wipe otherwise.
--   4. customers             — cascades: prescriptions, medical_records,
--                             medical_reports, customer_product_balances,
--                             wallet_txns, customer_packages (which itself
--                             cascades to customer_package_items and any
--                             remaining package_revenue_recognitions).
--
-- Left untouched on purpose: branches, services, categories, providers, rooms,
-- employee_accounts, roles — clinic configuration, not patient data. Deleting
-- those would break the ability to test bookings at all.
-- ============================================================================

begin;

delete from public.reservations;
delete from public.invoices;
delete from public.product_sales;
delete from public.customers;

commit;
