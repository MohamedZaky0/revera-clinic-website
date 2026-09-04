-- Add booking_id column to prescriptions table
ALTER TABLE "public"."prescriptions" ADD COLUMN IF NOT EXISTS "booking_id" UUID REFERENCES "public"."reservations"("id") ON DELETE SET NULL;
