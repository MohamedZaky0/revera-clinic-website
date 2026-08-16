# Admin Panel: Componentization → Arabic i18n → Automated Testing

> **Status:** Phase 0 complete (2026-08-17 — 107 tests, `ai_docs/WINDSURF_BRIEFS.md` Brief 3).
> Phase 1 not started; blocked on the open decisions at the bottom of this file.
> **Written:** 2026-08-17, after a full-system audit (RISK-038…RISK-050).
> **Owner decision required before Phase 0 starts.**

---

## Why this order, and not "just add Arabic"

The goal is Arabic in the admin panel, matching what the Doctor Portal already does. The blocker is
not translation — it's the file it would have to happen in.

Measured facts, `src/app/admin/page.tsx`:

| | |
|---|---|
| Lines | **27,733** |
| `useState` calls | **606** |
| Top-level sections rendered by `activeNav` | **~50** |
| Hardcoded UI strings (rough grep) | **~860** |
| `placeholder="..."` attributes | **160** |

Adding i18n directly to that file means ~1,000 scattered string edits in a single component that no
human can meaningfully review in one diff. That is precisely the condition under which the defects
found in this audit slipped through — a correct-looking local change whose interaction with distant
code nobody traced.

The Doctor Portal is the proof the target pattern works: `DoctorAccountView.tsx` is ~1,090 lines,
split into 12 tab/modal components, with `doctorTranslations[lang]` and `dir={lang === "ar" ? "rtl" : "ltr"}`.
Arabic there was tractable **because the split happened first**.

44 admin sub-components already exist (`src/components/admin/**`) — Finance, bookings, doctor,
inventory, marketing, packages, reception, services. This plan continues an established pattern; it
does not invent one.

**Therefore: extract → translate → test. Each phase is independently shippable and reviewable.**

---

## Phase 0 — Safety net first (do this before touching `page.tsx`) — ✅ DONE

Refactoring 27k lines with no automated tests is the riskiest thing in this plan. Build the net
before the trapeze.

**0.1 — Test infrastructure.** No test runner exists today (`package.json` has no test script; the
only tests are ad-hoc scripts in `scratch/` run manually via `npx tsx`). Install Vitest +
`@testing-library/react` + `jsdom`. Add `npm run test` and wire it into the existing `npm run check`.

**0.2 — Pure-logic unit tests (highest value per hour, zero UI coupling).** These functions already
hold the money and scheduling correctness and are pure or near-pure:

- `src/lib/billing.ts` → `computeSettledBalances()` — deltas, idempotency on re-fire, clamping.
- `src/lib/wallet.ts` → the zero-delta case writes no row; `amount > 0` invariant.
- `src/lib/customerBalances.ts` → ledger derivation vs. scalars.
- `src/lib/ledger.ts` → `buildInvoiceLine` / `buildInvoiceTotals`, tax-inclusive rounding.
- `src/lib/services.ts` → `getServiceDurationMinutes`, `getEffectiveServicePrice` (branch pricing),
  `getSessionStaleness` (thresholds, null `started_at` fallback).
- `src/lib/customerIdentity.ts` → `normalizeEgyptMobile`, `isOwnIdentity` (already has a scratch
  script — promote it to a real test).
- `src/lib/packages.ts` → `recognisedRevenuePerSession`, `deferredBalance` (the documented
  rounding-complement rule).

**0.3 — Regression tests for this audit's defects.** One test per fixed risk, so none can silently
return. Each is cheap and directly traceable to a real incident:

| Test | Guards |
|---|---|
| `amountLeft: null` → payment label is `"—"`, never `"Paid"` | RISK-039 |
| Unresolvable doctor/room → `"—"`, never a name or `Room N` | RISK-039 |
| `status: 'completed'` alone never implies paid | RISK-039 |
| Summary cards: Upcoming = today-onward; Completed/Cancelled = current month | RISK-044 |
| `postponed` is not counted as cancelled | RISK-044 |
| Wallet: zero delta writes no `wallet_txns` row | RISK-042 |
| Wallet: insufficient balance refuses the sale | RISK-042 |
| `getSessionStaleness`: null `started_at` → no fabricated duration | RISK-043 |

**0.4 — Route-level auth tests.** For every route: unauthenticated → 401/403; patient token on a
staff-only method → 403; patient requesting another patient's data → empty, not data. This is the
class that produced RISK-049 and would have caught it.

**Exit criteria:** `npm run test` green, `npm run check` green, and every item in 0.3 verified to
**fail** when its fix is reverted (a regression test that can't fail is decoration).

---

## Phase 1 — Extract sections from `page.tsx`

**Method — one section per PR, strictly mechanical:**

1. Pick one `activeNav === "X"` block.
2. Move its JSX into `src/components/admin/<area>/<X>View.tsx`.
3. Move the `useState` hooks used *only* by that section into the new component.
4. Pass genuinely shared state down as props. **Do not** introduce Redux/Zustand/Context in this
   phase — changing the state model and the file boundaries at the same time makes the diff
   unreviewable.
5. No behaviour change. No renames. No styling changes. No "while I'm here" fixes.
6. `npm run check` + `npm run test` green; browser-verify that one section.

**Suggested order** — leaf-most and least entangled first, so early PRs build confidence:

| Wave | Sections | Rationale |
|---|---|---|
| 1 | Settings group: Booking / Deposit / Notification / Queue / Inactivity / Service Hours / Pages Settings / Clinic Profile | Mostly forms over `page-settings`; few cross-dependencies |
| 2 | Config: Branches, Rooms, Areas, Product Categories, Terms & Conditions, Role Management | Simple CRUD tables |
| 3 | People: Employees, Doctors, Target Bonuses, HR | Self-contained, some shared provider state |
| 4 | Catalog: Services, Packages, Promotions, Coupons | Shared `localServices` — thread as props |
| 5 | Patients: Patients directory, Patient Profile drawer, Medical Forms, Prescriptions, Follow-up | Largest PII surface; do after the pattern is proven |
| 6 | Operations: Bookings, New Booking, POS, Inventory, Reports/Insights | Most entangled; do last |

**Realistic expectation:** ~50 sections, a handful of PRs per wave. This is weeks of incremental
work, not one task. Each PR is small and safe *because* it is boring — that is the point.

**Exit criteria per wave:** `page.tsx` line count measurably down, tests green, section verified in
browser. Track the line count in each PR description — it is the honest progress metric.

---

## Phase 2 — Arabic i18n

Only starts once a wave's sections are extracted. Runs **per component**, not globally.

**2.1 — Follow the Doctor Portal pattern exactly.** Create `src/components/admin/translations.ts`
exporting `adminTranslations = { en: {...}, ar: {...} }`, consumed as `adminTranslations[lang]`.
Namespace keys per section (`bookings.*`, `patients.*`, `settings.*`) so they stay navigable at
~900 keys — the doctor file is flat at ~400 and is already near its comfortable limit.

**2.2 — Language state.** Decide once, at the start of this phase:
- Reuse the existing site-wide `LanguageContext`, or
- Keep an admin-local `lang` state like `DoctorAccountView` does.

**Recommendation: admin-local**, mirroring the Doctor Portal. Staff language preference is separate
from the public site visitor's, and `LanguageContext` has a known SSR/CSR hydration mismatch
(observed during the `/book` work, still unfixed) that this phase should not inherit. Persist to
`localStorage` under the `CLIENT.storagePrefix`.

**2.3 — RTL.** `dir={lang === "ar" ? "rtl" : "ltr"}` on each extracted component's root. Audit for
direction-sensitive Tailwind: `ml-*`/`mr-*`, `left-*`/`right-*`, `text-left`/`text-right`,
`rounded-l-*`/`rounded-r-*`, and any `translate-x`. Prefer logical properties (`ms-*`, `me-*`,
`start-*`, `end-*`). Tables, drawers and the sidebar are where RTL usually breaks first.

**2.4 — Not translated (be explicit):** patient-entered data, doctor's clinical notes, service names
from the DB (they already have `en`/`ar` columns — use those, don't duplicate into the i18n file),
and currency/number formatting (decide separately whether to localise digits — **recommendation: no**,
keep Western digits for money to avoid accounting confusion).

**Per-component exit criteria:** every visible string comes from the translation file; component
renders correctly in both languages; RTL layout verified in the browser; no hardcoded English left
(grep the component for `>[A-Z]` and `placeholder="`).

---

## Phase 3 — Automated testing beyond Phase 0

Once components exist, they become testable in ways `page.tsx` never was.

- **Component tests** for each extracted section: renders, key interactions, empty/loading/error
  states, and both `en` and `ar` (catching missing keys and RTL breakage automatically).
- **API integration tests** against a Supabase test project — the full patient journey: book →
  approve → check in → start → complete → invoice → payment, asserting money at each step.
- **E2E (Playwright)** for the two flows where a silent failure is most expensive: public booking
  end-to-end, and reception approve → session → checkout.

**Deliberately deferred:** CI. Worth adding once the suite is real, but it is not what protects the
refactor — the tests are. Don't let CI setup delay Phase 0.

---

## What Windsurf does vs. what we do together

**Windsurf, with a written brief per unit of work:**
- Phase 0 test scaffolding and the pure-logic tests (well-specified, verifiable, no judgement).
- Phase 1 extractions — one section per brief, mechanical by construction.
- Phase 2 string extraction per component.
- Phase 3 test authoring from a spec.

**Us, together, in a live session:**
- The Phase 0 exit check: confirming each regression test actually fails when its fix is reverted.
- Reviewing the first extraction of each wave — that PR sets the pattern the rest copy.
- Every Arabic RTL visual check (a screenshot judgement, not a test assertion).
- The end-to-end browser session on the real flows. **Still outstanding from the audit** — code
  review and a green build are not evidence the flow works, which RISK-050 demonstrated:
  a fix that reviewed as correct never executed at all.

**Rules Windsurf must follow throughout:** `.windsurf/rules/*.md` (always-on) and
`.windsurf/MEMORIES.md`. Both were written from the actual defects this audit found.

---

## Open decisions (needed before Phase 0)

1. **Scope of Arabic** — the whole admin panel, or Reception-facing screens first? (Reception-first
   is a much shorter path to real value: Bookings, Patients, POS, New Booking.)
2. **Language state model** — admin-local vs. shared `LanguageContext` (recommendation above).
3. **Money digit localisation** — Western digits in Arabic mode? (Recommendation: yes, keep Western.)
4. **Appetite for Phase 1** — all ~50 sections, or only those needed for the chosen Arabic scope?
   Decision 1 largely determines this.
