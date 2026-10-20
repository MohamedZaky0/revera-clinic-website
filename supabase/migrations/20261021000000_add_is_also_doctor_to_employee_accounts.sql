-- 20261021000000_add_is_also_doctor_to_employee_accounts.sql
--
-- DEC-114: an admin / superadmin (or any standard-workspace role) can also treat patients. The
-- account keeps ONE role (so its login and permissions do not change), and this flag says the
-- person is also a doctor: they get a `providers` row, appear in the doctors list and booking
-- doctor pickers, and are paid through Doctor Payroll instead of the staff payroll.
--
-- Additive and idempotent. Default false changes nothing for existing accounts. Apply BEFORE
-- deploying the matching code: POST/PATCH /api/employees write the column when it is set.

ALTER TABLE public.employee_accounts
  ADD COLUMN IF NOT EXISTS is_also_doctor boolean NOT NULL DEFAULT false;
