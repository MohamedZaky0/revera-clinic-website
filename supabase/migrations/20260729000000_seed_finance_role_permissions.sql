-- Seed default finance.* permissions into the admin and superadmin roles.
-- Finance permissions are grantable and revocable (DEC-022); admins get them by
-- default so the new Finance section is reachable immediately, but they can be
-- removed per-role via the Role Permission settings UI.
UPDATE public.roles
SET permissions = array_cat(
  permissions,
  ARRAY[
    'finance.view_pnl',
    'finance.view_margins',
    'finance.view_cashflow',
    'finance.manage_expenses',
    'finance.manage_assets',
    'finance.manage_loans',
    'finance.view_capacity'
  ]::text[]
)
WHERE name IN ('admin', 'superadmin')
  AND NOT permissions @> ARRAY['finance.view_pnl']::text[];
