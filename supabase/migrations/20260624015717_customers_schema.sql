-- ============================================================
-- Revera Clinics — Customers Table and Connections Migration
-- Run this in your Supabase SQL Editor to create the table and migrate data
-- ============================================================

-- 1. Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  mobile              text NOT NULL UNIQUE,
  gender              text CHECK (gender IN ('Male', 'Female')),
  email               text UNIQUE,
  number_of_bookings  integer DEFAULT 0,
  registration_date   timestamptz DEFAULT now(),
  active              boolean DEFAULT true,
  spent_amount        numeric DEFAULT 0,
  outstanding         numeric DEFAULT 0,
  area                text,
  location_name       text,
  street_name         text,
  building_no         text,
  floor_no            text,
  note                text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Disable Row Level Security (RLS) on customers to allow access via the public Anon Key
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- 2. Link reservations table to customers
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

-- 3. Migrate existing unique customers from reservations to customers table
INSERT INTO customers (name, mobile, email, registration_date, created_at, updated_at)
SELECT DISTINCT ON (phone) 
  name, 
  phone AS mobile, 
  email, 
  MIN(created_at) OVER (PARTITION BY phone) AS registration_date,
  MIN(created_at) OVER (PARTITION BY phone) AS created_at,
  MAX(updated_at) OVER (PARTITION BY phone) AS updated_at
FROM reservations
ON CONFLICT (mobile) DO UPDATE 
SET 
  name = EXCLUDED.name,
  email = COALESCE(customers.email, EXCLUDED.email);

-- 4. Update reservations to point to the correct customer record
UPDATE reservations r
SET customer_id = c.id
FROM customers c
WHERE r.phone = c.mobile;

-- 5. Update number_of_bookings for each customer based on their reservations
UPDATE customers c
SET number_of_bookings = (
  SELECT count(*) 
  FROM reservations r 
  WHERE r.customer_id = c.id
);
