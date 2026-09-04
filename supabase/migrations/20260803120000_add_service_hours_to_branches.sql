-- ============================================================
-- Add branches.service_hours (schema drift fix)
-- Run this in your Supabase SQL Editor
--
-- ai_docs/DB_SCHEMA.md already documents this column ("Array of
-- {day, dayAr, isOpen, openTime, closeTime}, nullable — per-branch operating hours used by
-- availability"), and both src/app/admin/page.tsx (Manage Service Hours screen) and
-- src/components/BookingModal.tsx (calendar's getDayOperatingHours) already read/write it —
-- but no migration ever actually created the column. POST /api/branches was silently failing
-- on every attempt to save it (update, then a fallback upsert, both erroring on the missing
-- column) and returning the submitted payload back as if it had saved successfully, which is
-- why this went unnoticed: the admin UI always reported success. Net effect: every branch's
-- calendar/availability fell back to a hardcoded "every day open, 09:00-20:00" default and
-- never reflected real configured working hours. See RISKS.md RISK-037.
-- ============================================================

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS service_hours jsonb;
