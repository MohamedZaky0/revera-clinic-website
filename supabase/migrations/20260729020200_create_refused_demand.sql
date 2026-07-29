-- PROPOSAL-002 Phase 5, task 5.3. "Patients who found no free slot and left" leaves no trace
-- today -- PROPOSALS.md names this the single most important input for a capacity-expansion ROI
-- case. Schema-only: no application caller writes to this table yet (same pattern as `packages`,
-- task 1.5, existing before any endpoint wrote to it). Wiring a UI capture point (e.g.
-- BookingModal.tsx logging "no available slot shown, patient abandoned") is deliberately out of
-- scope for this migration.
CREATE TABLE IF NOT EXISTS public.refused_demand (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  service_id    bigint REFERENCES public.services(id) ON DELETE SET NULL,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  reason        text NOT NULL DEFAULT 'no_slot' CHECK (reason IN ('no_slot', 'too_expensive', 'other')),
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS refused_demand_branch_id_idx ON public.refused_demand (branch_id);

ALTER TABLE public.refused_demand ENABLE ROW LEVEL SECURITY;
