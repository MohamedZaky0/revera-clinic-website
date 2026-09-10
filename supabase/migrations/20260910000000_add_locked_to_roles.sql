-- Make the "system locked" state of a role real data instead of a hardcoded list.
--
-- Before this, the same array -- ['superadmin','admin','doctor','receptionist','reception'] --
-- was duplicated in src/app/api/roles/route.ts (DELETE guard) and in
-- src/components/admin/settings/RoleManagementView.tsx (the "System Locked" label), so the two
-- could silently disagree, and no one could lock a clinic's own custom role.
ALTER TABLE "public"."roles" ADD COLUMN IF NOT EXISTS "locked" BOOLEAN NOT NULL DEFAULT false;

-- Preserve the behaviour the hardcoded list used to give: these stay locked after the upgrade.
-- Only rows that actually exist are touched, so a clinic without a 'doctor' role is unaffected.
UPDATE "public"."roles"
SET "locked" = true
WHERE lower("name") IN ('superadmin', 'admin', 'doctor', 'receptionist', 'reception');
