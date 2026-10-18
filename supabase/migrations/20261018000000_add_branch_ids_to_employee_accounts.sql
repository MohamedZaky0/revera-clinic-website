-- 20261018000000_add_branch_ids_to_employee_accounts.sql
--
-- DEC-110: an employee can be assigned to more than one branch.
--
-- Additive. `employee_accounts.branch_id` is untouched and stays the employee's PRIMARY branch, so every
-- reader that only knows about one branch (HR roster, reception dashboard, attendance geofence, admin
-- shell branch lock, doctor -> providers sync) keeps working. `branch_ids` holds ALL assigned branches,
-- primary first. `/api/employees` writes the two together (branch_id = branch_ids[1]).
--
-- Why a uuid[] column and not an employee_branches junction table: one row means one atomic write (the
-- Supabase JS client has no multi-statement transaction, so a junction table could be left half-written
-- if the second insert failed), and every existing `select('*')` of employee_accounts returns the new
-- field with no change. The cost is no FK integrity on the array elements -- a deleted branch leaves a
-- dangling id behind -- which readers handle by resolving ids against the live `branches` table.
--
-- Backfill: every employee that has a branch_id gets it as their first (and only) assignment. Employees
-- with no branch_id (system-owner / global accounts, accounts provisioned from Role Management) keep an
-- empty array. Nothing is deleted or rewritten except the new column.
--
-- Idempotent: safe to re-run. NOT APPLIED BY THE ASSISTANT -- the owner applies it after review.
-- Apply it BEFORE deploying the matching code: POST/PATCH /api/employees write `branch_ids` and will
-- fail with "column branch_ids does not exist" against a database that does not have it yet.

ALTER TABLE public.employee_accounts
  ADD COLUMN IF NOT EXISTS branch_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

UPDATE public.employee_accounts
   SET branch_ids = ARRAY[branch_id]
 WHERE branch_id IS NOT NULL
   AND cardinality(branch_ids) = 0;

-- "Which employees work at branch X" is `branch_ids @> ARRAY[X]`.
CREATE INDEX IF NOT EXISTS employee_accounts_branch_ids_idx
  ON public.employee_accounts USING gin (branch_ids);
