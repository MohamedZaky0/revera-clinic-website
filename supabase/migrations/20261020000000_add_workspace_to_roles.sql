-- 20261020000000_add_workspace_to_roles.sql
--
-- DEC-113: which screen a role lands on is an explicit property of the role, not something the app
-- guesses from the employee's name, department or the substring "doc" in the role name.
--
--   'standard' -> the normal admin shell (sidebar filtered by the role's permissions)
--   'doctor'   -> the doctor workspace (Schedule, Ongoing Session, Patients, Analytics, Profile)
--
-- Default 'standard' keeps every existing role exactly as it behaves today, except the roles named
-- like a doctor, which are backfilled to 'doctor' so current doctor accounts see no change.
--
-- Additive and idempotent. Apply BEFORE deploying the matching code: GET/POST /api/roles and
-- /api/auth/me read and write the column.

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS workspace text NOT NULL DEFAULT 'standard';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'roles_workspace_check' AND conrelid = 'public.roles'::regclass
  ) THEN
    ALTER TABLE public.roles
      ADD CONSTRAINT roles_workspace_check CHECK (workspace IN ('standard', 'doctor'));
  END IF;
END $$;

UPDATE public.roles
   SET workspace = 'doctor'
 WHERE lower(name) IN ('doctor', 'doctors', 'physician')
   AND workspace <> 'doctor';
