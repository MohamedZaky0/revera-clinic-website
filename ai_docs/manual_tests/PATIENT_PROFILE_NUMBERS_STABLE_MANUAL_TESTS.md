# Patient Profile Numbers Stay Stable: Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> DEC-127; related: `ai_docs/RISKS.md` -> RISK-132, DEC-121. Automated coverage: `tests/components/patients/OpenProfileFinancialSync.test.tsx`, `tests/lib/profileFinancialWriters.test.ts`.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | Open the profile of a patient whose stored and calculated numbers differ; watch 60 s | dev.reveraclinics.com | | Not run yet |
| | Same on production for "hazem al hadary" (Total Spend 2,700, Outstanding 2,920) | production | | Not run yet |

## Checks
- [ ] Admin -> Patients -> open the profile of "hazem al hadary" (or on dev a patient with stored spent 0 whose bookings were paid). Financial Summary shows Total Spend 2,700 and Outstanding 2,920 and nothing changes for at least 60 seconds (the booking list refreshes about every 15 s in the background).
- [ ] The same two numbers appear in the Patients list row for that patient.
- [ ] Switch to another browser tab for a minute and come back: numbers unchanged.
- [ ] Close and reopen the profile: same numbers immediately, no jump after a moment.
- [ ] A patient whose stored and calculated numbers already agree: numbers unchanged and stable.
- [ ] Add Previous Booking with a payment while the profile is open: Total Spend rises by the paid amount once, then stays still.
- [ ] Settle a debt or sell a package while the profile is open: Outstanding / Wallet change once to the new value, then stay still.
- [ ] Booking History rows still show their own paid / left amounts (unchanged).
- [ ] Browser DevTools -> Performance monitor (or React Profiler): the admin page is not re-rendering continuously while the profile sits open.