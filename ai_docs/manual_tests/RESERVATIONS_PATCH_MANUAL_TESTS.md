# PATCH /api/reservations — Manual Test Checklist

Automated route-level coverage (52 tests) lives in `tests/routes/reservations-patch.test.ts`,
using the in-memory Supabase fake (`tests/helpers/supabaseFake.ts`). That fake has **no real
Postgres constraints** — this checklist covers the things only a live database or a live browser
can prove: actual CHECK constraints, actual concurrent bookings, and that the button a receptionist
clicks in the real admin panel calls the route the way the tests assume it does.

## Evidence log

| # | Check | Result | Evidence | Date | Tester |
|---|---|---|---|---|---|
| 1 | RISK-046: checked_in constraint fallback | | | | |
| 2 | Approve button — real room conflict | | | | |
| 3 | Complete checkout — full browser flow | | | | |
| 4 | Cancel button — wallet credit visible in UI | | | | |
| 5 | No-show button — spend visible in UI | | | | |
| 6 | Postpone — both paths from the UI | | | | |
| 7 | Concurrent checkout race | | | | |

## Checks

- [ ] **1. RISK-046 — `checked_in` status constraint.** On a database that has **not** applied
      `20260810000000_add_checked_in_reservation_status.sql`, check a patient in from the
      Reception screen. The route should fall back to storing `confirmed` and return a `warning`
      field explaining why — confirm the warning actually renders somewhere visible in the UI, not
      just in the network response. (The automated suite cannot exercise this: the fake has no
      CHECK constraint to reject the write in the first place.)
- [ ] **2. Approve — real double-booking.** With two pending bookings for the same service, date,
      and time slot, and only one compatible room free, approve one, then try to approve the
      other into the same slot. Confirm the second either lands in a different available room or
      is rejected — not silently double-booked into the same room.
- [ ] **3. Full checkout in the browser.** From Reception, complete a real booking with a mix of
      cash + wallet payment and a redeemed package item. Confirm: the invoice appears in the
      customer's history, the wallet balance shown in the UI matches what was deducted, and the
      package's remaining session count decremented.
- [ ] **4. Cancel — wallet credit.** Cancel a booking with a deposit paid. Confirm the customer's
      wallet balance shown in their profile increases by the deposit amount immediately, without
      needing a page refresh to appear.
- [ ] **5. No-show — spend recorded.** Mark a deposited booking as no-show. Confirm the customer's
      "Spent" figure in their profile increases by the deposit amount and their wallet is
      unaffected.
- [ ] **6. Postpone — both paths.** From the Bookings view, postpone a booking by picking a new
      date/time directly; separately, postpone a different booking by only setting a follow-up
      reminder date. Confirm the first keeps its original status, and the second shows as
      "Postponed" with the reminder date visible wherever staff review upcoming follow-ups.
- [ ] **7. Concurrent checkout.** Have two staff members (or two tabs) complete the same booking at
      the same time. Confirm only one invoice is created — this is a real race the in-memory fake
      cannot model since it never simulates two requests interleaving mid-write.
