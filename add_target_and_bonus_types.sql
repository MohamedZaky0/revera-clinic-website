-- ============================================================
-- Revera Clinics — Employee Target & Bonus Types Migration
-- Run this in your Supabase SQL Editor to add new target fields
-- ============================================================

ALTER TABLE public.employee_accounts 
ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'reservations' CHECK (target_type IN ('reservations', 'revenue')),
ADD COLUMN IF NOT EXISTS bonus_type text DEFAULT 'percentage' CHECK (bonus_type IN ('percentage', 'fixed'));

-- Update snapshots in payroll table to match
ALTER TABLE public.hr_payroll
ADD COLUMN IF NOT EXISTS target_type_snapshot text DEFAULT 'reservations',
ADD COLUMN IF NOT EXISTS bonus_type_snapshot text DEFAULT 'percentage';
