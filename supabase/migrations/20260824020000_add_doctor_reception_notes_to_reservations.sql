-- Brief 33: Give doctor and reception notes their own columns instead of sharing reservations.notes
-- Additive only — reservations.notes is NOT removed or migrated; old bookings keep whatever's already there.

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS doctor_notes text;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reception_notes text;
