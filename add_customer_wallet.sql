-- ============================================================
-- Revera Clinics — Add Customer Wallet Balance Column
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS wallet_balance numeric DEFAULT 0;
