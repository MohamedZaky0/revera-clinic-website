-- 20260920010000_add_islaser_to_services.sql
-- Adds islaser / is_laser boolean columns to services table to distinguish laser procedures requiring equipment connection and 3-tier payment options.

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS islaser boolean DEFAULT false NOT NULL;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_laser boolean DEFAULT false NOT NULL;

-- Mark existing laser services as islaser = true based on catalog tags / titles
UPDATE public.services
SET islaser = true, is_laser = true
WHERE lower(en) LIKE '%laser%' 
   OR lower(ar) LIKE '%ليزر%'
   OR id IN (5, 6, 15);
