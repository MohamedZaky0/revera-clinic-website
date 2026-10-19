-- 20261019000000_add_show_on_website_to_services.sql
--
-- DEC-111: a service can exist in the system without being advertised on the public website.
-- Use case: RRS, Derma and Mesotherapy are decided after the Consultation, so reception and the
-- doctor must be able to book and add them while the website does not offer them.
--
-- Deliberately a NEW column, not `visible`: `visible` is also what the soft delete sets
-- (`active = false, visible = false`) and the admin Services list hides every `visible = false`
-- row, so reusing it would make a service disappear from the admin screen and mix up with deleted
-- ones. Same shape as packages.show_on_website, but defaulting to TRUE so every existing service
-- keeps appearing on the website exactly as it does today.
--
-- Additive and idempotent. Apply BEFORE deploying the matching code: POST /api/services writes the
-- column and fails against a database that does not have it yet.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS show_on_website boolean NOT NULL DEFAULT true;
