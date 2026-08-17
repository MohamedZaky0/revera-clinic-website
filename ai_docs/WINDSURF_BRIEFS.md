# Windsurf Briefs — Revera clinic platform

**One file for all Windsurf work briefs.** New briefs get appended as a new section here; do not
create separate brief files. Completed briefs stay as a short archived record at the bottom.

Standing rules live in `.windsurf/rules/*.md` (loaded automatically) and `.windsurf/MEMORIES.md`.
**Those apply to every brief in this file and are not repeated here.** Read them first.

---

# ACTIVE BRIEF

## Brief 5 — Phase 1, Reception wave: extract Patients in 4 ordered sub-PRs (written 2026-08-17)

**Read first:** `ai_docs/ADMIN_REFACTOR_AND_I18N_PLAN.md` (Phase 1 method + rules), `DECISIONS.md`
→ **DEC-027** (modular sections) and **DEC-043** (Reception-first scope/order), and Brief 4's
archived entry below (the pattern this brief repeats 4 more times).

**Scope correction found while planning this brief — read before starting:** DEC-043's Reception
wave list ("Bookings, Patients, POS, New Booking") is no longer 4 open items:
- **`New Booking` is already extracted** — both `activeNav === "New Booking"`
  ([admin/page.tsx:23240](../src/app/admin/page.tsx)) and the in-tab toggle inside Bookings already
  just render the existing `AdminNewBookingView.tsx`. Nothing to do.
- **`activeNav === "Point of Sale"` ([admin/page.tsx:10675](../src/app/admin/page.tsx)) is dead mock
  UI, not the real POS** — it uses a hardcoded `MOCK_PRODUCTS` array, a `posCart` that's never
  persisted, and "Complete Payment" only does `alert(...)`, no API call. The real POS
  (`product_sales` table, per `CLAUDE.md`) is the "Sell Product" flow embedded inside the Patients
  /Customer Profile section (`showAddPatientProductModal`, `showSellPackageModal`) — it isn't a
  separate section. **Do not extract or translate the standalone "Point of Sale" screen** — it would
  be Arabic-izing something that doesn't do anything real. Flag it as a separate product question
  (build a real POS, or remove the dead nav item) — not this brief's problem to solve.
- **`Bookings` is already extracted** (`AdminBookingsView.tsx`).

That leaves **Patients** as the entire remaining Reception-wave scope — `activeNav === "Patients"`,
[admin/page.tsx:11160–13201](../src/app/admin/page.tsx), ~2,041 lines. Too large for one PR (Brief
4 was ~90 lines) and internally too coupled to move as a single block — it has 5 distinct regions
gated by mutually-exclusive top-level conditionals, mapped by reading the actual structure (not
guessed):

| # | Region | Gate | Approx. lines | Size |
|---|---|---|---|---|
| 1 | Medical Report Modal | `showMedicalReportModal &&` | 12684–12771 | ~88 |
| 2 | Medical Form (Intake) Modal | `showMedicalFormModal &&` | 12445–12683 | ~239 |
| 3 | Customer Create/Edit Form Modal | `showCustomerFormModal && !viewingCustomerProfile &&` | 12772–12914 | ~143 |
| 4 | Patients Directory / List Table | `!viewingCustomerProfile && !showCustomerFormModal &&` | 12915–13200 | ~286 |
| 5 | Customer Profile Drawer | `viewingCustomerProfile &&` | 11164–12444 | ~1,280 |

**This brief covers sub-PRs 1–4 only, in that order (smallest/most self-contained first).**
Sub-PR 5 (the Profile Drawer) is deliberately **not** scoped here — see "Why the Profile Drawer is
a separate future brief" below.

### Verified facts each sub-PR should confirm for itself before moving anything

Grep counts done while writing this brief (whole-file, not just the Patients block):

- `showMedicalReportModal`: 2 references (declaration + 1 usage) — fully self-contained.
- `showMedicalFormModal`: 2 references — fully self-contained.
- `showCustomerFormModal`: 3 references — check the third use site before assuming full
  self-containment (same check Brief 4 did for `clinicName` etc.).
- `viewingCustomerProfile`: **82 references across the file.** This is the reason sub-PR 5 is out of
  scope here — this state is almost certainly read/set from places outside the Patients block too
  (e.g. a "View Customer" link from a booking). **Do not move its `useState` declaration into any
  extracted component without first enumerating where all 82 references actually are** — it likely
  needs to stay lifted at the `admin/page.tsx` level and be passed down as a prop, the same way
  `authenticatedJsonHeaders` was passed into `ClinicProfileSettingsView`.

Each sub-PR's own trigger handlers (`setShowMedicalFormModal(true)`, etc.) are set from functions
defined around lines 6700–7236 — confirm whether each specific handler function is called only from
within its own modal's own trigger point (self-contained, move it with the modal) or from elsewhere
too (shared, leave it at the parent and pass as a prop) before moving it — same verification method
Brief 4 used for `handleSaveClinicProfile`.

### Method (repeated from the plan/Brief 4 so this is self-contained)

For **each** of the 4 sub-PRs, separately:
1. Confirm self-containment by grep, per the verified facts above.
2. Move the JSX block, its `useState` calls, and its handler function(s) into a new file under
   `src/components/admin/patients/` (new directory, per DEC-027's `src/components/admin/<area>/`
   convention — no `patients/` subfolder exists yet).
3. Pass genuinely shared state/callbacks down as props (no Redux/Zustand/Context).
4. **No behaviour change. No renames. No styling changes. No "while I'm here" fixes.**
5. `npm run check` green (includes `npm run test` — the 107 existing tests must still pass).
6. Browser-verify that specific sub-section still works identically.
7. **One commit per sub-PR** — do not batch all 4 into one commit. Reference this brief (Brief 5)
   and which sub-PR number in each commit message.

Suggested filenames: `MedicalReportModal.tsx`, `MedicalFormModal.tsx`, `CustomerFormModal.tsx`,
`PatientsDirectoryView.tsx` — adjust if a clearer name emerges while actually looking at the code.

### Why the Profile Drawer (sub-PR 5) is a separate future brief, not part of this one

At ~1,280 lines with 5 internal sub-tabs (info, history, prescriptions/records, products, packages)
and 3 further nested modals (`logUsageModalBalance`, `showAddPatientProductModal`,
`showSellPackageModal` — the latter two being the *real* POS/package-redemption flows mentioned
above), it needs the same kind of decomposition this brief just did for the outer Patients block,
one level deeper — not a single move. It also owns `viewingCustomerProfile`, the 82-reference state
that likely can't simply relocate. Scoping that properly needs enumerating those 82 sites first,
which is real investigation work belonging to its own brief, written after sub-PRs 1–4 land and are
reviewed.

### Exit criteria

- All 4 sub-PRs merged, each its own commit, `npm run check` green after each.
- `admin/page.tsx`'s `activeNav === "Patients"` block reduced to the Profile Drawer region only
  (~1,280 lines) plus whatever thin wiring connects the 4 extracted components.
- PR description(s) explicitly note "Point of Sale" was found to be dead mock UI and flag it as a
  separate open question, not silently ignored.

### What happens after this brief

Phase 2 (Arabic) can start on sub-PRs 1–4 once they're extracted and reviewed — they don't need to
wait for the Profile Drawer. Sub-PR 5 gets its own investigation-then-brief cycle.

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

### Brief 4 — Phase 1 pattern-proving PR: extract Clinic Profile Settings (completed 2026-08-17)
Extracted `activeNav === "Clinic Profile"` from `admin/page.tsx` (8 `useState` calls,
`handleSaveClinicProfile`, ~90 lines of JSX) into
`src/components/admin/settings/ClinicProfileSettingsView.tsx`, taking one prop
(`authenticatedJsonHeaders`), per DEC-027/DEC-043. Moved verbatim — no behaviour change. Confirmed
RISK-058 (fields never hydrate from saved data) and RISK-001 (hardcoded Revera defaults) both left
untouched as required, both already logged separately.

Review outcome: matched the report in every number checked — diff is 2 insertions/117 deletions on
`page.tsx` (a pure structural move), `tsc --noEmit` 0 errors, `eslint` 0 errors (133 pre-existing
warnings, unchanged), `vitest run` 107/107 passing, all independently re-run rather than trusted
from the report. Proves the mechanical extract-and-test loop works — Phase 1 moves on to the
Reception wave next.
