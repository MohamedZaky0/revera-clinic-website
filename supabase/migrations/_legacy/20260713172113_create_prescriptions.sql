-- ============================================================
-- Prescription / Medical Records Table Setup
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prescriptions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  patient_name   text NOT NULL,
  date           date NOT NULL DEFAULT CURRENT_DATE,
  diagnosis      text,
  medications    jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of medications: { name, dosage, instructions }
  general_notes  text,
  doctor_notes   text, -- Show only to doctors, do not print
  follow_up_date date,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Add Policies for prescriptions
DROP POLICY IF EXISTS "Allow public read access to prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Allow service_role full access to prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Allow public write access to prescriptions" ON public.prescriptions;

CREATE POLICY "Allow public read access to prescriptions" ON public.prescriptions FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access to prescriptions" ON public.prescriptions FOR ALL TO service_role USING (true);
CREATE POLICY "Allow public write access to prescriptions" ON public.prescriptions FOR ALL USING (true);
