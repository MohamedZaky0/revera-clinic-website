-- 20260728010000_packages_public_display_fields.sql
-- Adds the fields needed to show packages on the public marketing site, the same way
-- promotions already show there: an Arabic name (packages.name was English-only) and a
-- "show_on_website" flag decoupled from `active` (which also gates sellability at POS —
-- a package can stay active for POS/consumption purposes while no longer advertised).

ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS name_ar text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS show_on_website boolean NOT NULL DEFAULT false;
