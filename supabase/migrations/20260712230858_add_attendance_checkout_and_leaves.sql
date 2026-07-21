-- SQL migration to add check_out_time column to hr_attendance
ALTER TABLE public.hr_attendance 
  ADD COLUMN IF NOT EXISTS check_out_time timestamptz;
