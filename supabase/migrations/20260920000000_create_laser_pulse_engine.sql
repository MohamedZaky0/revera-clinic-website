-- 20260920000000_create_laser_pulse_engine.sql
--
-- DEC-062: Unified Laser Pulse Counter Engine
-- Supports:
-- 1) Type 1: Sell by Service (fixed service price, standard pulses for history, additional pulses = Qty * Value with reason)
-- 2) Type 2: Sell by Pulse (FIFO pulse balance consumption, multiple purchases, combined active balance)
-- 3) Type 3: Pulse Included in Package (package-level pulse balance tracking and session deduction)
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.laser_pulse_logs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id               uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  reservation_id            uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  pulse_type                text NOT NULL DEFAULT 'SERVICE'
                              CHECK (pulse_type IN ('SERVICE', 'PULSE_PURCHASE', 'PACKAGE')),
  service_id                bigint REFERENCES public.services(id) ON DELETE SET NULL,
  service_name              text NOT NULL DEFAULT 'Laser Session',
  treatment_area            text,
  service_price             numeric NOT NULL DEFAULT 0,
  pulses_used               integer NOT NULL DEFAULT 0,
  remaining_balance_after   integer,
  additional_pulses         integer NOT NULL DEFAULT 0,
  additional_pulses_reason  text,
  pulse_value               numeric NOT NULL DEFAULT 0,
  additional_charge         numeric NOT NULL DEFAULT 0,
  total_patient_charge      numeric NOT NULL DEFAULT 0,
  source_id                 text,
  device_id                 text,
  device_name               text,
  doctor_id                 uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  doctor_name               text,
  added_by                  text,
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS laser_pulse_logs_customer_id_idx ON public.laser_pulse_logs(customer_id);
CREATE INDEX IF NOT EXISTS laser_pulse_logs_reservation_id_idx ON public.laser_pulse_logs(reservation_id);
CREATE INDEX IF NOT EXISTS laser_pulse_logs_pulse_type_idx ON public.laser_pulse_logs(pulse_type);

ALTER TABLE public.laser_pulse_logs ENABLE ROW LEVEL SECURITY;
