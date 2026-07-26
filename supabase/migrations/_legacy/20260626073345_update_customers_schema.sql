-- ============================================================
-- Revera Clinics — Customers Table Expansion Migration
-- Run this in your Supabase SQL Editor to add new customer fields
-- ============================================================

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS national_id text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS referral text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS occupation text;
