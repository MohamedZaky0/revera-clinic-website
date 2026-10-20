-- 20261022000000_add_is_active_to_employee_accounts.sql
--
-- DEC-117: an employee account can be switched Inactive. An inactive account keeps its role,
-- history, payroll and attendance records but has no access to the system: every API call that
-- identifies staff and /api/auth/me refuse it, and the matching Supabase Auth user is banned so it
-- cannot sign in or refresh a token. Activating it again restores everything as it was.
--
-- This replaces the old "soft delete", which overwrote role_name with 'inactive' (losing the real
-- role and not actually blocking anything). No existing row uses that value (checked on both
-- projects before this migration), so there is nothing to convert.
--
-- Additive and idempotent. Default true changes nothing for existing accounts. Apply BEFORE
-- deploying the matching code: the access check selects this column on every staff request.

ALTER TABLE public.employee_accounts
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
