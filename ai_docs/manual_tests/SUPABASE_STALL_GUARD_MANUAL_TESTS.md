# Supabase Stall Guard: Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> DEC-126; related: `ai_docs/RISKS.md` -> RISK-131. Automated coverage: `tests/lib/stallGuardFetch.test.ts`.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-25 | Baseline before the change: 12 repeats of `/api/auth/me` with a fake token | production | 9 of 12 at 0.2 s; 2.1 s, 19.8 s, 44.9 s once each | Problem measured |
| | Same 12 repeats after the change | dev | | Not run yet |
| | Same after production deploy; sign in as superadmin and as a receptionist | production | | Not run yet |

## Checks
- [ ] Repeat `curl -s -o /dev/null -w "%{time_total}
" https://<site>/api/auth/me -H "Authorization: Bearer bogus.token.value"` 30 times: none takes more than about 10 s (before: some took 20-45 s).
- [ ] Sign in as superadmin and as a receptionist: the login completes and the admin opens without a long "Verifying administrator session..." screen.
- [ ] Open Employees, Roles, Inventory > Suppliers, Inventory > Products: all load, no "Failed to fetch".
- [ ] Add a product and add a supplier: each is created exactly once (a stalled save is not repeated, so no duplicates); if a save fails, the screen says so and a second try works.
- [ ] Vercel logs for the next day show no `did not return an initial response within 25s` for `/api/employees` or `/api/roles`.
