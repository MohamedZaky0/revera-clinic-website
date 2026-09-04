-- PROPOSAL-002 Phase 5, task 5.2. Capacity math (room_minutes/doctor_minutes) needs to know when
-- a branch is closed or a provider is on leave -- today's calculation only knows branches'
-- regular service_hours and providers' regular working_days_hours/shifts[], neither of which
-- models exceptions, overstating capacity on a closure/leave day.
--
-- One table for both branch closures and doctor leave, distinguished by which FK is set: both are
-- the same kind of fact ("this capacity is not available on this date"), and task 5.5's
-- room/doctor minute calculation checks the same table for both cases rather than two.
CREATE TABLE IF NOT EXISTS public.holiday_calendar (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  provider_id  uuid REFERENCES public.providers(id) ON DELETE CASCADE,
  date         date NOT NULL,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (branch_id IS NOT NULL OR provider_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS holiday_calendar_date_idx ON public.holiday_calendar (date);

ALTER TABLE public.holiday_calendar ENABLE ROW LEVEL SECURITY;
