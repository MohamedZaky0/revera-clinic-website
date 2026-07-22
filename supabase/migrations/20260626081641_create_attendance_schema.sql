-- ============================================================
-- Revera Clinics — Providers Attendance Table Migration
-- Run this in your Supabase SQL Editor to create the attendance table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.provider_attendance (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid REFERENCES public.providers(id) ON DELETE CASCADE,
  date         date NOT NULL,
  status       text NOT NULL CHECK (status IN ('Present', 'Absent', 'On Leave')),
  check_in     time,
  check_out    time,
  notes        text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(provider_id, date)
);

-- Disable Row Level Security (RLS) to keep it consistent with other public clinic tables
ALTER TABLE public.provider_attendance DISABLE ROW LEVEL SECURITY;
