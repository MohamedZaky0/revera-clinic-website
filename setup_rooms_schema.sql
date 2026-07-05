-- ============================================================
-- Rooms System — Database Setup & Seeding
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('clinical', 'administrative')),
  status      text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'on_cleaning', 'needs_cleaning', 'has_issue')),
  branch_id   uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2. Create Service Rooms Junction Table
CREATE TABLE IF NOT EXISTS public.service_rooms (
  service_id  bigint REFERENCES public.services(id) ON DELETE CASCADE,
  room_id     uuid REFERENCES public.rooms(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, room_id)
);

-- 3. Update Reservations Table
ALTER TABLE public.reservations 
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rooms uuid[] DEFAULT '{}';

-- 4. Disable RLS for rooms and service_rooms
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_rooms DISABLE ROW LEVEL SECURITY;

-- 5. Seed default rooms using dynamic branch lookup
DO $$
DECLARE
  new_cairo_id uuid;
  zayed_id uuid;
  room_id_val uuid;
BEGIN
  -- Get Branch IDs
  SELECT id INTO new_cairo_id FROM public.branches WHERE name_en = 'New Cairo Branch' LIMIT 1;
  SELECT id INTO zayed_id FROM public.branches WHERE name_en = 'Sheikh Zayed Branch' LIMIT 1;

  -- Seed Rooms for New Cairo
  IF new_cairo_id IS NOT NULL THEN
    -- Admin Rooms
    INSERT INTO public.rooms (name, type, status, branch_id) VALUES
      ('New Cairo Reception', 'administrative', 'available', new_cairo_id),
      ('New Cairo Manager Office', 'administrative', 'available', new_cairo_id)
    ON CONFLICT DO NOTHING;

    -- Clinical Rooms
    INSERT INTO public.rooms (name, type, status, branch_id) VALUES
      ('Laser Room NC 1', 'clinical', 'available', new_cairo_id),
      ('Laser Room NC 2', 'clinical', 'available', new_cairo_id),
      ('Dermatology Room NC 1', 'clinical', 'available', new_cairo_id),
      ('Gynecology Room NC 1', 'clinical', 'available', new_cairo_id),
      ('Physiotherapy Room NC 1', 'clinical', 'available', new_cairo_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Seed Rooms for Sheikh Zayed
  IF zayed_id IS NOT NULL THEN
    -- Admin Rooms
    INSERT INTO public.rooms (name, type, status, branch_id) VALUES
      ('Zayed Reception', 'administrative', 'available', zayed_id),
      ('Zayed Manager Office', 'administrative', 'available', zayed_id)
    ON CONFLICT DO NOTHING;

    -- Clinical Rooms
    INSERT INTO public.rooms (name, type, status, branch_id) VALUES
      ('Laser Room ZY 1', 'clinical', 'available', zayed_id),
      ('Laser Room ZY 2', 'clinical', 'available', zayed_id),
      ('Dermatology Room ZY 1', 'clinical', 'available', zayed_id),
      ('Gynecology Room ZY 1', 'clinical', 'available', zayed_id),
      ('Physiotherapy Room ZY 1', 'clinical', 'available', zayed_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Seed Service Rooms Junctions
  -- Laser Hair Removal (id=5) -> Laser Room NC 1, Laser Room NC 2, Laser Room ZY 1, Laser Room ZY 2
  FOR room_id_val IN SELECT id FROM public.rooms WHERE name IN ('Laser Room NC 1', 'Laser Room NC 2', 'Laser Room ZY 1', 'Laser Room ZY 2') LOOP
    INSERT INTO public.service_rooms (service_id, room_id) VALUES (5, room_id_val) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Skin Dermatology Clinics (id=1) -> Dermatology Room NC 1, Dermatology Room ZY 1
  FOR room_id_val IN SELECT id FROM public.rooms WHERE name IN ('Dermatology Room NC 1', 'Dermatology Room ZY 1') LOOP
    INSERT INTO public.service_rooms (service_id, room_id) VALUES (1, room_id_val) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Gynecology Clinics (id=11) -> Gynecology Room NC 1, Gynecology Room ZY 1
  FOR room_id_val IN SELECT id FROM public.rooms WHERE name IN ('Gynecology Room NC 1', 'Gynecology Room ZY 1') LOOP
    INSERT INTO public.service_rooms (service_id, room_id) VALUES (11, room_id_val) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Physical Therapy (id=21) -> Physiotherapy Room NC 1, Physiotherapy Room ZY 1
  FOR room_id_val IN SELECT id FROM public.rooms WHERE name IN ('Physiotherapy Room NC 1', 'Physiotherapy Room ZY 1') LOOP
    INSERT INTO public.service_rooms (service_id, room_id) VALUES (21, room_id_val) ON CONFLICT DO NOTHING;
  END LOOP;

END $$;

-- Drop old service-based unique constraint index to allow multiple bookings per slot in different rooms
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_unique_approved_slot;
DROP INDEX IF EXISTS public.reservations_unique_approved_slot;

-- Create new room-based unique constraint index to prevent double-booking a single room
CREATE UNIQUE INDEX IF NOT EXISTS reservations_unique_room_slot 
ON public.reservations (room_id, date, time_slot) 
WHERE (status = 'approved' AND room_id IS NOT NULL);
