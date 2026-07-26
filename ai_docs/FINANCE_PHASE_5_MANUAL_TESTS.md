# Phase 5 Manual Test Checklist — Capacity and Optimization

> **Living document.** Update this checklist in the implementation commit for every 5.x task. Capacity results must be tested from known schedules and bookings, not only unit tests.

## Evidence log

| Date | Task | Environment | Evidence | Result |
|---|---|---|---|---|

## Per-task checklist

- [ ] **5.1 Reservation lifecycle:** Approve, complete, cancel, and no-show separate test reservations; confirm only the matching timestamp is set and invalid status is rejected.
- [ ] **5.2 Holiday/leave calendar:** Create branch closure, provider leave, and valid combined scope if supported; confirm invalid no-context rows fail.
- [ ] **5.3 Refused demand:** Confirm table constraints/indexes; when a writer is added, test the precise public capture trigger and abuse controls.
- [ ] **5.4 Split shifts:** Configure 09:00–13:00 and 16:00–20:00 shifts; verify availability offers both windows and never the gap.
- [ ] **5.5 Capacity library:** Hand-check room minutes, split-shift doctor minutes, bottleneck choice, completed-only booked minutes, utilisation, and zero denominator behavior.
- [ ] **5.6 Break-even library:** Hand-check fixed-cost rollup and break-even; verify zero/negative contribution ratio fails visibly.
- [ ] **5.7 Service mix library:** Verify rank uses contribution margin per minute, committed package minutes are netted out, demand caps are obeyed, and the greedy allocation matches a hand-worked fixture.
- [ ] **5.8 Regression suite:** Record every Phase 5 scratch check result.
- [ ] **5.9 Capacity endpoint:** Compare returned room/doctor/bottleneck/booked/utilisation values with a known branch-day fixture, including holiday and no-show cases.
- [ ] **5.10 Service-mix endpoint:** Compare ranking, optimal allocation, potential revenue, and gap decomposition against a known fixture.
- [ ] **5.11 Contract and tracker close-out:** Confirm endpoints are documented, every task has evidence/commit state, and all unresolved tracker questions are revisited.
