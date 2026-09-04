-- ============================================================
-- Backfill: medical_records, medical_reports, customer_product_balances
-- Run this in your Supabase SQL Editor
--
-- These three tables were already live in the database and are queried by
-- src/app/api/medical-records/route.ts and src/app/api/customers/products/route.ts,
-- but had no migration file (someone created them ad-hoc via the Table Editor
-- or SQL Editor outside tracked history). Columns below are reverse-engineered
-- from the exact fields those routes read/write — see ai_docs/DB_SCHEMA.md
-- "Schema Drift" section for the audit trail. This file exists so a fresh
-- database can be provisioned from supabase/migrations/ alone; it is a no-op
-- (IF NOT EXISTS) against the existing production database.
--
-- RLS: enabled with NO permissive policy, matching the posture established by
-- 20260722140000_enable_row_level_security.sql — these tables are only ever
-- accessed server-side via the service role key (which bypasses RLS), so no
-- anon/authenticated policy is added here on purpose.
-- ============================================================

-- 1. Medical intake form — one row per customer, upserted on customer_id
CREATE TABLE IF NOT EXISTS public.medical_records (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id                  uuid NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
  skin_type                    text DEFAULT 'Normal',
  main_concerns                text[] DEFAULT '{}',
  other_concerns_details       text DEFAULT '',
  has_previous_treatments      boolean DEFAULT false,
  previous_treatments_details  text DEFAULT '',
  has_medical_conditions       boolean DEFAULT false,
  medical_conditions_details   text DEFAULT '',
  is_taking_medication         boolean DEFAULT false,
  medication_details           text DEFAULT '',
  allergies                    text DEFAULT '',
  created_by_role              text DEFAULT 'Receptionist',
  created_by_name              text DEFAULT 'Staff',
  created_at                   timestamptz DEFAULT now(),
  updated_at                   timestamptz DEFAULT now()
);

-- 2. Medical reports — many rows per customer (uploaded files/reports)
-- id is app-generated (`REP-<timestamp>`), not DB-generated, so it's text not uuid.
CREATE TABLE IF NOT EXISTS public.medical_reports (
  id           text PRIMARY KEY,
  customer_id  uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title        text DEFAULT 'Medical Report',
  description  text DEFAULT '',
  file_url     text,
  doctor_name  text DEFAULT 'Dr. Revera',
  date         date DEFAULT CURRENT_DATE,
  created_at   timestamptz DEFAULT now()
);

-- 3. Customer product purchase/usage balances (retail products sold to patients)
-- id is app-generated (`cpb-<timestamp>-<rand>`), so text not uuid.
-- product_id is NOT a hard FK to inventory_products — the route synthesizes a
-- `prod-<timestamp>` placeholder id when none is supplied, which would violate
-- a FK constraint.
CREATE TABLE IF NOT EXISTS public.customer_product_balances (
  id                  text PRIMARY KEY,
  customer_id         uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name       text,
  customer_mobile     text,
  product_id          text,
  product_name        text NOT NULL,
  product_sku         text,
  purchased_quantity  numeric DEFAULT 0,
  used_quantity       numeric DEFAULT 0,
  remaining_quantity  numeric DEFAULT 0,
  unit_price          numeric DEFAULT 0,
  total_amount        numeric DEFAULT 0,
  status              text DEFAULT 'Active' CHECK (status IN ('Active', 'Depleted')),
  usage_history       jsonb DEFAULT '[]'::jsonb, -- array of { id, quantity_used, used_at, used_by, notes }
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_product_balances ENABLE ROW LEVEL SECURITY;
