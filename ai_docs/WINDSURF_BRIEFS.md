# Windsurf Briefs — Revera clinic platform

**One file for all Windsurf work briefs.** New briefs get appended as a new section here; do not
create separate brief files. Completed briefs stay as a short archived record at the bottom.

Standing rules live in `.windsurf/rules/*.md` (loaded automatically) and `.windsurf/MEMORIES.md`.
**Those apply to every brief in this file and are not repeated here.** Read them first.

---

# ACTIVE BRIEF

## Brief 4 — Phase 1 pattern-proving PR: extract Clinic Profile Settings (written 2026-08-17)

**Read first:** `ai_docs/ADMIN_REFACTOR_AND_I18N_PLAN.md` (Phase 1 method + rules) and
`ai_docs/DECISIONS.md` → **DEC-027** (modular admin sections mandatory) and **DEC-043** (this
brief's scope/order decision). This is the first Phase 1 extraction — its job is to prove the
mechanical extract-and-test loop works before Phase 1 moves on to the Reception wave
(Bookings/Patients/POS/New Booking), where Arabic (Phase 2) actually starts. **No Arabic in this
PR.** Pure extraction only.

**Why Clinic Profile:** smallest, most self-contained candidate in Wave 1. Verified by grep that
every piece of its state and its one handler is referenced nowhere else in `admin/page.tsx` —
zero cross-section coupling to untangle.

### Scope

Extract `activeNav === "Clinic Profile"` from `src/app/admin/page.tsx`:

- **JSX block:** lines ~15626–15715 (`{activeNav === "Clinic Profile" && (...)}`).
- **State to move** (lines 4594–4602, currently under the `// ── Clinic Profile Settings State ──`
  comment): `clinicName`, `clinicNameAr`, `clinicLocation`, `clinicLocationAr`, `clinicEmail`,
  `clinicPhone`, `clinicWhatsapp`, `savingClinicProfile` — all 8 `useState` calls, confirmed used
  only inside this block.
- **Handler to move** (lines 6018–6034): `handleSaveClinicProfile`. Posts to
  `POST /api/page-settings` with `{ clinic: { name, name_ar, location, location_ar, email, phone,
  whatsapp } }`. Self-contained — no other section calls it.
- **New file:** `src/components/admin/settings/ClinicProfileSettingsView.tsx`, per DEC-027's
  established `src/components/admin/<area>/` convention.
- **Props needed from the parent shell:** `authenticatedJsonHeaders` (the shared auth header object
  built in `admin/page.tsx`) — the only external dependency this section has.

### Method (from the plan, repeated here so this brief is self-contained)

1. Move the JSX into the new component; move the 8 `useState` calls and the one handler with it.
2. Pass `authenticatedJsonHeaders` down as a prop. No Redux/Zustand/Context introduced.
3. **No behaviour change. No renames. No styling changes. No "while I'm here" fixes** — even though
   two real, pre-existing issues are visible in this exact code and easy to "fix while you're in
   there": **do not fix them in this PR.**
   - The 8 `useState` calls initialize from hardcoded defaults and never hydrate from saved data —
     logged as **RISK-058** (`ai_docs/RISKS.md`), already documented, do not fix here.
   - Those same hardcoded defaults are also literal Revera-specific values (RISK-001) — also out of
     scope for this mechanical extraction PR.
   - Reference both RISK-058 and RISK-001 in the PR description so they stay visible for whoever
     picks up that separate follow-up.
4. `npm run check` + `npm run test` green.
5. Browser-verify: open Settings → Clinic Profile, confirm all 7 fields render and are editable,
   Save Profile still POSTs successfully (check network tab for `POST /api/page-settings` 200), no
   console errors. This will surface the missing-hydration bug live — expected, not a regression,
   since it already behaves this way before the extraction.

### Exit criteria

- `src/app/admin/page.tsx` no longer contains the Clinic Profile JSX/state/handler; line count down
  by roughly this section's size.
- New `ClinicProfileSettingsView.tsx` renders identically to the pre-extraction screen.
- `npm run check` green.
- PR description explicitly lists the two flagged-not-fixed issues above.

### What happens after this PR

Once reviewed and confirmed working, Phase 1 moves directly to the Reception wave (Bookings,
Patients, POS, New Booking) per DEC-043 — not the rest of Wave 1's other Settings sections. Phase 2
(actual Arabic translation) starts once a Reception section is extracted, not before.

---
---

# ARCHIVE — completed briefs

Kept as a short record only. Full detail of what was found and fixed lives in `ai_docs/RISKS.md`
(RISK-038 … RISK-050), which is the authoritative account.

### Brief 1 — Reception ↔ Doctor workflow defects (completed 2026-08-16)
Nine tasks covering RISK-038 (session total silently discarded — no `price` column),
RISK-039 (fabricated payment status / doctor / room), RISK-040 (orphaned & duplicate public
bookings), RISK-041 (admin booking captured no payment; unreachable fallback insert reported
success), RISK-045 (prescription save reported success on failure), RISK-047 (hardcoded doctor and
discarded requested time on approve), RISK-048 (ungated pulse counter, missing out-of-stock).

Review outcome: five defects found in the delivered work and fixed separately — a nullable column
coerced to 0 (reintroducing the "Paid" bug in narrower form), a React stale-closure read after the
setter that populates it, one numbered sub-point silently skipped, cache invalidation applied to 2
of ~20 call sites, and a PATCH payload missing fields the user can still change.

### Brief 2 — Wallet ledger & API authorization (completed 2026-08-16/17)
RISK-042: `wallet_txns` was never written by anything; POS wallet payments never deducted the
balance; package sales never updated `spent_amount` and hardcoded `payments.method` to `'cash'`.
Fixed via a shared `src/lib/wallet.ts` helper used at all four wallet write sites.
RISK-036: twelve routes with no server-side authorization, guarded **per method** so the public
site's unauthenticated reads keep working.

Review outcome: implementation was correct in every detail checked. One documentation error
(a claim that a defect was unfixed when it had been fixed) and one unrequested file deletion,
both corrected.

**What both briefs missed, and why the Phase 0 net exists:** neither review caught that
`GET /api/reservations` had no auth at all (RISK-049), or that Brief 1's public-booking PATCH calls
were being silently rejected with 401 by a pre-existing gate, meaning the bug they fixed was never
actually fixed (RISK-050). Both were found later by direct re-examination. Code review and a green
build did not surface either one — tests would have.

### Brief 3 — Phase 0: test infrastructure & regression net (completed 2026-08-17)
Installed Vitest, wired `npm run test` into `check`. 107 tests across 8 files: pure-logic coverage
for `billing.ts`, `customerIdentity.ts`, `packages.ts`, `ledger.ts`, `services.ts`,
`customerBalances.ts`; a named regression suite for RISK-012/043/049/DEC-023; and route-level auth
tests that import the real `GET`/`POST` handlers with `supabaseServer` mocked at the module boundary.
Deferred (logic not exported as pure functions, needs Phase 1 extraction): RISK-038…048, 050.

Review outcome: matched the report in every number checked — 107 tests, 0 type errors, no
application code touched. Went further than the brief's own "invert and confirm" requirement for
the one test that matters most: temporarily reverted the actual RISK-049 fix in
`src/app/api/reservations/route.ts` to its pre-fix, fully-open state and confirmed
`tests/routes/auth.test.ts` catches it — the same route a real PII leak reached production through,
now with a test that would have caught it the first time.
