-- Add service_hours column of type JSONB to the branches table if it does not exist
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS service_hours jsonb DEFAULT '[
  {"day": "Sunday", "dayAr": "الأحد", "isOpen": true, "openTime": "09:00", "closeTime": "20:00"},
  {"day": "Monday", "dayAr": "الإثنين", "isOpen": true, "openTime": "09:00", "closeTime": "20:00"},
  {"day": "Tuesday", "dayAr": "الثلاثاء", "isOpen": true, "openTime": "09:00", "closeTime": "20:00"},
  {"day": "Wednesday", "dayAr": "الأربعاء", "isOpen": true, "openTime": "09:00", "closeTime": "20:00"},
  {"day": "Thursday", "dayAr": "الخميس", "isOpen": true, "openTime": "09:00", "closeTime": "20:00"},
  {"day": "Friday", "dayAr": "الجمعة", "isOpen": false, "openTime": "09:00", "closeTime": "20:00"},
  {"day": "Saturday", "dayAr": "السبت", "isOpen": true, "openTime": "09:00", "closeTime": "20:00"}
]'::jsonb;
