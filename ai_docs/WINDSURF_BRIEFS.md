# Windsurf Briefs — Revera clinic platform

**One file for all Windsurf work briefs.** New briefs get appended as a new section here; do not
create separate brief files. Completed briefs stay as a short archived record at the bottom.

Standing rules live in `.windsurf/rules/*.md` (loaded automatically) and `.windsurf/MEMORIES.md`.
**Those apply to every brief in this file and are not repeated here.** Read them first.

---

# ACTIVE BRIEF

## Brief 23 — Phase 2: translate `AdminEmployeesView.tsx` to Arabic

**Prerequisite: none blocking** — Brief 21 already landed and was verified. This is the Phase 2
pass over the file it created (`src/components/admin/employees/AdminEmployeesView.tsx`, 3,086
lines). Re-measure every line number below before starting; they were captured 2026-08-22.

**Wiring — copy the pattern already used three times, exactly.** The component currently takes 24
props and none of them are `lang`/`t`/`dir` (`AdminEmployeesViewProps`, lines 51–94), and its call
site (`page.tsx:10246-10286`) passes none. Add `lang: "en" | "ar"` and
`t: typeof adminTranslations["en"]["employees"]` to the props, and pass `lang={lang}`
`t={adminTranslations[lang].employees}` at the call site — identical to how `AdminInventoryView`
does it (`AdminInventoryView.tsx:32-33,57` and its call site at `page.tsx:10236-10237`).
`adminTranslations` lives in **`src/components/admin/translations.ts`** (2,154 lines), NOT
`src/lib/translations.ts` — that's a different file for the public site. Add a new 6th top-level
namespace `employees` mirrored under both `en` and `ar` (existing five: `patients`, `bookings`,
`doctors`, `services`, `inventory`). Nest sub-objects the way `doctors` does (`adminDoctorsView` +
`providerFormFields`).

**`dir` — the component root is `AdminEmployeesView.tsx:862`**,
`<div className="space-y-6 animate-fadeIn">` — the same className `AdminInventoryView` uses, so
apply `dir={lang === "ar" ? "rtl" : "ltr"}` there identically. **The file currently has ZERO `dir=`
attributes anywhere**, and unlike Services it has no bilingual-content input (no Arabic
name/description pair), so there is nothing here to confuse with the language toggle — after this
brief there should be exactly one `dir` in the file.

**Scale — the grep floor is 174, and the floor badly understates this one.** `grep '>[A-Z][a-z]'`
= 174, plus 11 `placeholder=`, 8 `title=`, and 7 native `alert()`/`confirm()` calls (lines 506,
1214, 1306, 2347, 2873, 2882, 2931 — native dialogs still render text and still need `t.*`).
Rough distribution: list/table + filters ~15 (862–1186); Add/Edit form ~36 across basic fields
(1187–1470), the Doctor & Medical Configuration panel (1470–1784), non-doctor shift/target fields
(1785–1852), and address/national-ID/contract upload (1852–2226); the 7-tab profile view ~72
(2227–3083, the single biggest chunk).

**Two non-JSX string builders that the floor misses entirely — these need an explicit scope
decision, do not silently skip them:**
- `handlePrintEmployeeProfile` (503–860, ~357 lines) builds a whole HTML document as a string for
  `window.open` printing — roughly **49** label/heading strings, and it re-derives department,
  shift and status independently rather than reusing the JSX's values, so it reproduces the same
  value/label bugs a second time. It also hardcodes `"Revera Clinic"` as letterhead at line 646,
  which is a pre-existing CLAUDE.md rule-2 violation — **flag it, do not fix it here.**
- `handleExportAttendanceInsights` (436–463) builds a CSV with hardcoded English column headers
  (440–452) and hardcoded fallback cell values `'Day'`/`'Present'`/`'09:00 AM'`.
Neither receives `lang` today. **Decide deliberately**: either thread `lang`/`t` into both (a
printed profile and an exported CSV arguably *should* follow the UI language), or leave both
English-only on purpose. Either is defensible; silently translating the JSX and leaving these two
in English is not, because a user in Arabic mode would print an English profile with no warning.

**Value/label separation — the recurring bug class, and this file has the most subtle version yet.**
- **Department and Role are DB-driven open sets, not fixed enums.** `departmentsList` and
  `rolesList` are props populated from admin-managed database rows. They are rendered as both
  `value` and label (department filter 942–944, form select 1452; role select 1416–1419), while
  logic elsewhere does substring matching on them: `.toLowerCase().includes("doc")` at 1221, 1471,
  1786 (department), and 1409, 1445–1446 (role). **You cannot map these through a static `t.*`
  table** the way Doctors' Gender was mapped — an admin can create any department name. Do what
  Brief 20's `categoryLabel()` did: a small helper that translates the known fixed literals used
  as fallbacks (`"Reception"` at 1048, `"Doctors"`) and passes any unrecognised DB value through
  unchanged. **Every `.includes("doc")` comparison must keep comparing against the raw English
  value, never a translated one** — translate the label at the render site only.
- **`emp.shift` free-text substring matching**: filter logic at 990–1002 tests `.includes("day")`,
  `.includes("am")`, `.includes("night")`, `.includes("pm")`; badge colour at 1057 tests
  `.includes("night")`/`.includes("pm")`; raw display at 1058, 2501, and 706 (print). Same rule —
  label only.
- **A fourth instance Brief 21 did not flag**, because it's an exact-match ternary rather than
  substring: `emp.shift === "Night" ? "General Night Shift" : "General Day Shift"` and its
  associated time-range strings at 710, 718, 722, 788, 792 (print) and 2506, 2512, 2518 (profile
  Work tab). The comparison side is safe (exact match on canonical `"Night"`), but the displayed
  strings are hardcoded English needing `t.*`.
- **Employee status is SAFE — confirmed, do not "fix" it.** `email_confirmed_at ? "Active" :
  "Invited"` (1066) / `"Pending Invitation"` (2289, 2456, 683) is purely derived from a boolean
  and never appears on the left of a `===` anywhere in the file. Translate each occurrence freely.
  Note the pre-existing copy inconsistency: the table says "Invited", everywhere else says
  "Pending Invitation" — pick one Arabic phrase for both and note the choice.
- **Target type / bonus type are NOT in this file** despite living nearby conceptually — no
  `"reservations"`/`"revenue"` or `"percentage"`/`"fixed"` toggle exists here. The Target &
  Performance tab (2572–2652) hardcodes a single model. Don't go looking for them.
- **A positive example to preserve, not change**: the shift filter at 951–953 already does this
  correctly — `value="Day"` stays canonical while the visible text reads "Day Shift". Keep that
  shape.
- **A limitation to document rather than close**: `check.gender` / `check.governorate` /
  `check.birthDate` are rendered raw at 2962–2967 and in the national-ID success block (1975+),
  but they come from `parseEgyptianNationalId`, a prop function defined in `page.tsx` and therefore
  out of this single-file brief's scope. Wrap what you can at the display site and note that the
  source function still returns English.

**Dates and numbers — this file has the widest exposure to the unpinned-locale bug so far.** 4
calls are correctly pinned to `en-US` (511, 847, 2463, 2868). **11 are unpinned** and will silently
follow the browser's locale — and critically, **9 of those 11 are `toLocaleString()` on numbers,
not dates**: 726, 730, 757, 769 (print), 1062 (table salary), 2542, 2547 (profile payroll), 2627
(bonus), plus `toLocaleTimeString()` with no locale at 450–451 (CSV) and the `[]` empty-locale form
at 2781–2782 (attendance times — `[]` is the same bug; only the options are pinned, not the
locale). In Arabic these render Arabic-Indic digits and different separators. Pin every one.
**Match this file's own existing convention (`en-US`, all 4 pinned calls) rather than Brief 18's
`en-GB`** — the wider tree is split ~28 `en-GB` / ~22 `en-US` with no dominant convention, so
internal consistency wins here; state the choice explicitly in the PR.

**Day names — a real duplicate that Brief 21 deliberately did not merge.** The weekly shift grid
at 1628–1738 renders `{day}` raw at **line 1645** with no lookup at all — invisible to
`grep '>[A-Z][a-z]'` because it's an interpolated expression, exactly the bug Brief 18 found in
Doctors. `ProviderFormFields.tsx` already has a `dayNames` lookup
(`translations.ts:573-582` en / `1649-1658` ar under `doctors.providerFormFields`). Because Brief
21 explicitly did NOT deduplicate these two implementations, **give Employees its own `dayNames`
block** under the new `employees` namespace, mirroring that shape exactly (7 canonical English keys
`Sunday`…`Saturday`). Do not import the Doctors one across namespaces.

**The overlap-warning messages are the largest single piece of new translation work here, and
Brief 18 did NOT already solve this elsewhere.** Correcting a common assumption:
`checkShiftOverlaps` exists only in this file (`grep -rln` across `src/components/admin/` returns
one hit) — `ProviderFormFields.tsx` has the grid UI but **no overlap checker and no warning banner
at all**. The function (282–397) builds complete English sentences with interpolated values:
line 336 `Invalid shift duration on ${day} at ${bName} (In-Clinic): End time (${s.end}) must be
after start time (${s.start}).`, line 364, and line 389 `Shift Overlap Detected on ${day}: ...
overlaps with ...`. These must become parameterised translated strings (template functions on `t`,
not static labels). The `"In-Clinic"` / `"Online Consultations"` type labels baked into those
messages (310, 342, 370) are the same literals as the tab toggle (1607, 1618) — they must resolve
to the same translated label in both places. The banner header `⚠️ Shift Overlap Warning:` (1756)
is a simple string on top of that.

**Do NOT touch the permission gate.** Confirmed post-extraction: the component contains zero
`hasPermission`/`canManage`/`adminRole` calls. Its only four hits on those terms (956, 985–986,
1025, 2343) are data filtering that hides the synthetic `superadmin` system row from the list and
its Revoke button — not permission logic. The real gate is `adminRole === "superadmin"` at
`page.tsx:10246`. Leave both alone.

**Key parity:** there is no committed parity test or script — Briefs 18/19 counted by hand,
Brief 20 relied on structural typing. Use the structural-typing proof as the primary guarantee
(typing the prop as `typeof adminTranslations["en"]["employees"]` makes any en/ar mismatch a `tsc`
error at the call site) and report a manual count alongside, as the previous three briefs did.

**Method / exit criteria:** identical to every prior Phase 2 brief. `tsc`/`eslint` clean, `vitest`
unchanged, no hardcoded English left in JSX (sweep interpolated expressions by reading, not only
by grep), RTL logical properties (`text-start`/`ps-`/`me-`) instead of physical ones in every
changed line. Manual test checklist per CLAUDE.md covering both languages: list/filters, add and
edit employee (including the doctor sub-panel, the weekly grid day names, and a deliberately
overlapping shift to see the warning text), all 7 profile tabs, notes, and whichever decision you
made about the print/CSV outputs.

---
---

# QUEUED BRIEFS

## Brief 24 — Phase 2: translate `AdminHrView.tsx` to Arabic

**Prerequisite: satisfied.** Brief 22 landed as `c7fb113` and was independently verified 2026-08-22
(including a live browser check that the relocated Edit Target modal still opens). Re-measure all
line numbers before starting anyway — they were captured immediately post-extraction.

**Target:** `src/components/admin/hr/AdminHrView.tsx`, 1,901 lines. Same wiring as Brief 23 — add
`lang` + `t: typeof adminTranslations["en"]["hr"]` to `AdminHrViewProps` (currently no `lang`/`t`/
`dir` anywhere) and pass them from the call site in `page.tsx`. Add an `hr` namespace to
`translations.ts` mirrored under `en` and `ar`.

**`dir` — READ THIS BEFORE WRITING ANY JSX. This component does not have a single root.** It
returns a Fragment (`return ( <> ...` at line 180–181) wrapping **two siblings**: the main
`<div className="space-y-6 animate-fadeIn">` (182–1747) and the detached Edit Target modal
`{editingTargetEmployee && (...)}` (1748–1898). A Fragment cannot carry `dir`. **Both siblings need
their own `dir={lang === "ar" ? "rtl" : "ltr"}`.** Putting it only on the main div — the obvious
thing to do, and what every previous single-root brief did — leaves the Edit Target modal rendering
left-to-right in Arabic. This is the single most likely mistake in this brief.

**Dates and numbers — worse than any previous target: all 17 `toLocale*` calls are unpinned, zero
are pinned.** Breakdown: 10 bare `toLocaleString()`, 5 `toLocaleString(undefined, {...})`
(explicitly passing `undefined` as the locale is the same bug as passing nothing), and 2
`toLocaleTimeString([], {...})` (the `[]` form pins the options but not the locale). Since this is
the payroll screen, these are salary and bonus figures — in Arabic they will render with
Arabic-Indic digits and different separators. Pin every one. Unlike Brief 23 there is no existing
in-file convention to match, so use `en-GB` per Brief 18's precedent and state the choice.

**Value/label separation — one genuinely dangerous site here, unlike the mostly-cosmetic ones
elsewhere.** `statusLabel` in the Payroll tab is **both compared and displayed**: compared at 655,
657, 662 to choose the badge colour, and rendered raw at 664 (and again at 1009 in Doctor Payroll).
If you translate the variable itself, the three comparisons silently stop matching and every badge
renders in the fallback colour — a bug that looks like a styling glitch, not a translation bug, and
that no type checker will catch. **Derive a separate display label; never reassign `statusLabel`.**
Other sites, all label-only:
- Leave status `"Pending"`/`"Approved"`/`"Rejected"` — compared at 227, 1162; displayed raw at 1158.
- Payroll/Doctor-payroll filter comparisons at 337–339 and 791–792, and `pay.status === "Paid"` at
  533, 955.
- Attendance status displayed raw at 1562.
- Leave type displayed raw at 1146.
Everything on the left of a `===` stays canonical English.

**Do NOT fix the Payroll status filter bug while you are in there.** Lines 338 and 339 are
identical conditions (`payrollFilterStatus === "Pending" && status === "Paid"` and
`... === "Overdue" && status === "Paid"`), so selecting "Overdue" returns exactly the same rows as
"Pending" — only the badge at 655–662 actually distinguishes them by date. This is a real
pre-existing bug, already documented in Brief 22, and it is **out of scope for a translation
brief**. Translating the two filter option labels is in scope; making them behave differently is
not. Flag it in the PR description.

**Do NOT touch the permission gate.** HR has *no* content-level gate at all — no `hasPermission`,
no `adminRole` check anywhere in the section (looser than Employees, which at least has
`adminRole === "superadmin"` at its call site). That is intentional and was preserved verbatim by
Brief 22; preserve it again. The only gating is sidebar visibility in `page.tsx`.

**Scope by sub-tab** (7 tabs, all inline in this one file — re-measure, these are pre-extraction
proportions): Overview (workforce directory), Payroll (the largest, with inline bonus/deduction
editors and a Pay action), Doctor Payroll (same shape, separate data), Leaves (request table +
submit form), Performance (review timeline + create form), Attendance (daily log + inactivity
alerts), Targets (per-employee progress table) — plus the detached Edit Target modal.

**Method / exit criteria:** same as Brief 23. Manual test checklist per CLAUDE.md covering all 7
sub-tabs in both languages, and explicitly including the Edit Target modal in Arabic to confirm the
second `dir` was applied.

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

### Brief 5 — Phase 1, Reception wave: extract Patients in 4 ordered sub-PRs (completed 2026-08-17)
Scoping this brief found DEC-043's Reception wave was already 2/4 done before it was written —
`New Booking` and `Bookings` were both already extracted (`AdminNewBookingView.tsx`,
`AdminBookingsView.tsx`), and `activeNav === "Point of Sale"` turned out to be dead mock UI (hard
coded `MOCK_PRODUCTS`, no persistence, "Complete Payment" is just an `alert()`) — not the real POS,
which is the `product_sales`-backed "Sell Product" flow embedded inside Patients. Flagged as a
separate open product question, out of scope here.

That left Patients (~2,041 lines) as the entire remaining scope, mapped into 5 mutually-exclusive
regions and split into 4 ordered sub-PRs (smallest/most self-contained first), each its own commit:
Medical Report Modal (`MedicalReportModal.tsx`, ~88 lines), Medical Form/Intake Modal
(`MedicalFormModal.tsx`, ~239 lines), Customer Create/Edit Form (`CustomerFormModal.tsx`, 20 state
vars + save handler + 2 open handlers), Patients Directory/List Table
(`PatientsDirectoryView.tsx`, presentational, all shared state via props). Sub-PR 5 (the ~1,280-line
Customer Profile Drawer, which owns `viewingCustomerProfile` — 82 references file-wide) was
deliberately left out, needing its own investigation-then-brief cycle rather than the same template.

Review outcome: all 4 sub-PRs independently re-verified against the actual repo, not trusted from
the report — `tsc --noEmit` 0 errors, `eslint` 0 errors (137 warnings, consistent with pre-existing
patterns), `vitest run` 107/107 passing on the final combined state, all 4 component files present,
`admin/page.tsx` down from 27,733 to 26,763 lines. One process note: commits for Sub-PR 2 and 3
ended up commingled with an unrelated parallel workstream's changes (DEC-042's `reservation_products`
migration + API wiring, being built in the same working tree at the same time) — content in both was
correct and independently verified, but commit-message attribution for those two is not clean. Not
rewritten — pushed as-is per explicit direction, given the risk of rewriting history while a second
process might still be committing to the same branch.

### Brief 6 — Phase 2 setup + pattern-proving translation: MedicalReportModal (completed 2026-08-17)
Scoping this brief found two things worth correcting before it started: `DoctorAccountView`'s `lang`
state (the plan's own cited reference pattern) has no `localStorage` persistence at all, despite the
plan's own 2.2 calling for it — added as a deliberate improvement, not copied as-is. Separately,
`admin/page.tsx` already had a dead `lang` state (`useState<"EN"|"AR">("EN")`, never read, `setLang`
never called) — same shape of gap as `attachedProducts` (DEC-042), scaffolding declared and
abandoned. Replaced it rather than adding a second one, with lowercase `en`/`ar` matching Doctor
Portal and the public `LanguageContext`'s convention.

Delivered: admin-local `lang` state with `localStorage` persistence (`revera_admin_lang`), a
language toggle in the sidebar visually matching `DoctorSidebar`'s existing one, new
`src/components/admin/translations.ts` (`adminTranslations`, namespaced `patients.*`), and
`MedicalReportModal.tsx` fully translated — all 15 hardcoded strings (enumerated by reading the file
directly, not guessed) replaced with `t.*` lookups, `dir` attribute added, RTL audited (no
direction-sensitive Tailwind classes present).

Review outcome: matched the report in every number and file checked — diff touched exactly the 3
expected files, `tsc --noEmit` 0 errors, `eslint` 0 errors (131 warnings, pre-existing patterns),
`vitest run` 107/107 passing, `grep '>[A-Z]'` on the translated file returns 0 matches, all
independently re-run against the actual repo rather than trusted from the report. Proves the
translation mechanism end-to-end — next 3 Brief 5 components repeat Part B only, Part A's setup
doesn't need redoing.

### Briefs 7-9 — Phase 2 Reception translations: MedicalFormModal, CustomerFormModal,
PatientsDirectoryView (completed 2026-08-17)

Translated the remaining 3 Brief-5-extracted Patients components into Arabic, repeating Brief 6's
Part B pattern: `MedicalFormModal.tsx` (skin-type/concern value-label separation via
`t.skinTypes[...]`/`t.concerns[...]` lookups, stored values kept English), `CustomerFormModal.tsx`
(~40 strings, Gender dropdown, 8-option Referral Source dropdown), `PatientsDirectoryView.tsx`
(purely presentational, first component in the rollout with real RTL-sensitive Tailwind).

**Reported complete, independent re-verification found 3 gaps — the same failure shape DEC-043's
own "Correction to the plan's own framing" section had already flagged once (Doctor Portal:
extracted but not actually translated).** This is the second occurrence of that pattern:
1. Brief 8's Gender-dropdown fix was skipped — `<option value="Male">Male / ذكر</option>` (the
   pre-existing cramped-bilingual hack the brief explicitly said to fix) was left unchanged.
2. Value/label separation was never added for Brief 7's skin-type/concern buttons or Brief 8's
   referral-source options — raw English `.map()`-ed directly into the button/option label instead
   of going through a lookup object. Stored values were correctly still English (no data-shape
   regression) — only the display layer was wrong.
3. Brief 9's flagged RTL items (`left-3.5`/`pl-10 pr-4` on the search bar, `text-left` on table
   headers and both dropdown menus) were all still present, untouched, despite the brief calling
   this out explicitly as needing browser confirmation.

Review outcome: all 3 gaps closed in a follow-up pass. Two same-pattern items were also found and
fixed in the same pass, beyond the original 3: `MedicalFormModal.tsx`'s scrollable-content padding
(`pr-1` → `pe-1`, logical property) and `PatientsDirectoryView.tsx`'s filter-panel Gender/Status/
Referral `<option>` labels (translation keys already existed in `translations.ts` — added when the
gaps report was written — but were never wired into the JSX until this pass). `tsc --noEmit` 0
errors, `vitest run` 107/107 passing, all independently re-run against the actual repo. Manual test
checklist: `ai_docs/manual_tests/ADMIN_I18N_BRIEFS_7_9_GAPS_MANUAL_TESTS.md`. **Note for whoever
writes Brief 11+:** this is now the second time "extracted and reported translated" turned out to
mean "extracted, and the report overstated how much was actually translated" — treat completion
reports on this rollout with the same skepticism DEC-043 already recommended for the Doctor Portal.

### Brief 10 — Sub-PR 5: move `viewingCustomerProfile` state out of `admin/page.tsx` (completed 2026-08-19)

Moved `viewingCustomerProfile`/`setViewingCustomerProfile` and its ~15 supporting effects/handlers
(prescriptions, medical records, product balances, package sell/redeem, add-product, print) into a
new `src/components/admin/patients/useCustomerProfile.ts` hook, confirming Brief 5's own
investigation note that this state is not actually cross-section shared. `admin/page.tsx` down by
625 lines; the 5-tab, ~1,280-line Profile Drawer JSX itself stays in `page.tsx` as scoped —
deliberately not touched, that's Brief 11.

Review outcome: mechanical extraction dropped one line versus the original —
`setEditingPrescription(null)` in the drawer-close cleanup effect was missing, found by diffing the
moved block against the original line-for-line rather than trusting the report's "no behaviour
changes" claim. Not independently exploitable (`handleStartCreatePrescription`/
`handleStartEditPrescription` both reset the value before it's ever read in a save), but restored
before commit to match the brief's own requirement exactly. Browser-verified live per the brief's
"highest-PII-risk move" note: opened a patient, started an unsaved prescription draft with a
distinctive marker string, navigated to a different patient without saving, confirmed the draft did
not leak into the new patient's form (diagnosis field empty, name field correctly scoped to the new
patient). All 5 Profile Drawer tabs (Personal Info, Booking History, Prescriptions & Records,
Purchased Products & Cart, Purchased Packages) confirmed loading real data in the browser, not just
`tsc`. `tsc --noEmit` 0 errors, `eslint` 0 new errors (one pre-existing-pattern warning in the new
hook file — missing `authenticatedJsonHeaders` dep, same shape as the original, not introduced by
this move). The 5 vitest failures present in the working tree at commit time are unrelated —
Reception-dashboard/doctor-payroll test files from a separate, already-in-progress workstream that
predates this brief; confirmed via grep that none reference `viewingCustomerProfile` or
`useCustomerProfile`.

### Brief 11 — Sub-PR 5 Part 2: extract Customer Profile Drawer JSX out of `admin/page.tsx` (completed 2026-08-19)

Moved the ~1,300-line drawer block (5 tabs, 3 inline modals: log usage, add product, sell package)
out of `admin/page.tsx` into `src/components/admin/patients/CustomerProfileDrawer.tsx`, receiving
Brief 10's hook output as props rather than re-calling `useCustomerProfile()` — `page.tsx` keeps its
one call for the two `activeNav`-dependent effects Brief 10 left there. No translation in this
brief, per the extract-then-translate split; that's Brief 12.

Review outcome: structurally correct — `tsc --noEmit` 0 errors, all 5 tabs and all 3 nested modals
independently browser-verified loading real patient data and opening correctly (log usage modal
verified by code read only, since it needs a patient with an existing product balance to trigger and
none was on hand; the other 4 tabs + 2 modals were exercised live). **Report explicitly admitted
browser verification was skipped** ("Playwright MCP server crashed mid-session, from killing all
node processes") and asked for manual verification instead of doing it — done independently rather
than accepted as-is. Side note: killing "all node processes" also killed an unrelated project's dev
server that happened to be running on the same port; not this repo's process to kill, worth knowing
for next time.

Found one real ESLint **error** (not a warning) in the new file — `react-hooks/purity` flagging a
`Date.now()` call during render in the Purchase History date column. Traced via `git log -S` to a
commit predating this whole Windsurf-briefs effort — pre-existing, not introduced by this
extraction. The reason it surfaced now: `page.tsx` at 25k+ lines was too large for the React
Compiler's purity checker to analyze (confirmed — 0 errors on the pre-extraction file despite the
identical line existing in it), so it silently never fired there; the newly-isolated, reasonably-
sized component is analyzable and caught it. Fixed to match the codebase's existing "never
fabricate, show em-dash" convention (RISK-039) instead of reading the render-time clock as a
fallback — browser-verified the empty-state path still renders correctly. `vitest run`: 597 passed,
6 expected fail, 0 unexpected (matches the report's number, independently re-run).


### Brief 12 — Phase 2: translate `CustomerProfileDrawer.tsx` to Arabic (completed 2026-08-19)

Translated the 1,539-line Profile Drawer (5 tabs + 3 inline modals) via a new
`patients.customerProfileDrawer` namespace in `translations.ts`. All 18 RTL-sensitive Tailwind
classes converted to logical properties exactly as scoped (`text-right`×10 → `text-end`,
`text-left`×5 → `text-start`, `right-1`×2 → `end-1`, `ml-2` → `ms-2`); all 7 placeholders
translated; `dir` applied on the component root only. Reused the existing
`medicalFormModal` skinTypes/concerns lookups rather than duplicating them.

Review outcome: the translation itself held up under checks that caught real gaps in Briefs 7-9 —
`grep '>[A-Z][a-z]'` returns 0, en/ar key parity is exact (345 keys each, verified by script, no
one-sided keys rendering `undefined`), every `toLocale*` call left on `en-GB`/`en-US` per DEC-043
(confirmed by diffing the commit: only surrounding copy changed, never a locale argument), and
value/label separation is correct throughout — payment methods keep `value="cash"` with Arabic
labels, reservation status goes through a lookup with the raw value still passed to
`getStatusBadgeClass()`, and stored skin-type/status values are unchanged.

**Two gaps found and closed.** (1) The package-history status badge still rendered
`String(pkg.status).replace("_"," ")` — the raw DB value — so an expired/used-up package showed
English text on an otherwise fully Arabic screen. The brief's own `>[A-Z][a-z]` scope grep could
not see it because it is an interpolated expression, not literal JSX text; this is precisely the
"the grep count is a floor, not a total — enumerate by reading" caveat the brief wrote in advance.
Fixed with the same lookup-plus-fallback shape already used for reservation status, so an
unrecognised status degrades to the old rendering instead of blank. Not exercisable in the browser
(needs a patient holding a non-`active` package; none available) — flagged as Pending in the
checklist rather than claimed as verified. (2) The manual test checklist required by the brief's
exit criteria and by CLAUDE.md was not written; written now as
`ai_docs/manual_tests/BRIEF_12_PROFILE_DRAWER_I18N_MANUAL_TESTS.md`.

Browser-verified independently in both languages: all 5 tabs and the Add Product / Sell Package
modals render fully Arabic, booking status shows `مكتمل` while the record keeps `completed`,
dates/money stay Western (`18 Aug 2026`, `2360 EGP`), and English mode reverts cleanly. `tsc` 0
errors, `eslint` 0 errors, `vitest` 597 passed / 6 expected fail (baseline unchanged).

**Process note:** Windsurf began Brief 13 in the same working tree while this verification was
running, so its in-progress `bookings.adminBookingsView` keys were already sitting uncommitted in
`translations.ts` — the same file this fix touches. Rather than repeat Brief 5's commit
commingling, only this change's own hunks were staged (built against `HEAD` and staged via
`update-index`), leaving Brief 13's work untouched in the working tree for its own commit.

### Brief 13 — Phase 2: translate `AdminBookingsView.tsx` to Arabic (completed 2026-08-19)

Added `lang`/`t` props (this component had none before), a `bookings.adminBookingsView` namespace —
the first top-level namespace beyond `patients` — and wired it through `admin/page.tsx`'s single
render site (there is only one; the brief's own note about "a second render site around ~21804"
was a mistake made while writing the brief, mixing this component up with `AdminNewBookingView`,
which genuinely does render twice — corrected here, not a gap in the delivered work).

Review outcome: this was the highest value/label-separation risk in the rollout so far — the exact
component RISK-054 broke once already — and it held up. `getStatusConfig()`/`getPaymentStyle()`
switch on the raw canonical status/payment value and return only the translated label; every
comparison and both `supabase.update({ status: ... })` call sites are untouched English literals,
confirmed by grep rather than assumed. All 15 `toLocale*` calls left on `en-GB`/`en-US`. Sweep for
remaining hardcoded strings/RTL classes: 0/0. en/ar key parity: 345/345 against the commit as
authored. `tsc`/`eslint` clean, `vitest` 597 passed unchanged. Browser-verified live in both
languages via a full page-text dump — every card, table header, legend label (all 8 statuses), and
the one live row's badges (`مؤكد`/`مدفوع جزئياً`) translated correctly while `Wednesday, 19 August
2026` and `09:00 AM` stayed English; English mode reverts cleanly. The report's own manual test
checklist was accurate and well-scoped — given a dated independent-evidence table rather than
rewritten.

**Process note, not a content defect:** the work arrived committed as part of a single ~2,550-line
commit that also swept in an entirely separate, already-in-progress test-coverage workstream
(Finance/doctor component tests, `fetchFake` helpers, `vitest.config.ts`, package dependency
changes, `.claude/launch.json`) — the same commingling pattern as Brief 5, at larger scale. Not yet
pushed at the time this was found, so safely un-commingled locally: soft-reset, then staged only
this brief's 4 actual files. `translations.ts` needed extra care since Brief 14 was being written
concurrently in the same file — extracted just the `adminBookingsView` block via brace-depth-aware
parsing (a naive string-anchor insertion attempt first landed the block outside the `en`/`ar`
objects entirely, caught by `tsc` before it was staged) and staged that exact blob through git
plumbing, leaving Brief 14's in-progress `adminNewBookingView` additions untouched in the working
tree.

### Brief 14 — Phase 2: translate `AdminNewBookingView.tsx` to Arabic (completed 2026-08-19)

Added `lang`/`t` props, extended the `bookings` namespace with `adminNewBookingView`, wired both
of `page.tsx`'s render sites (this component genuinely does render twice, unlike Bookings). Also
fixed a pre-existing bilingual-hack pattern in the Session Type radio cards (same shape as the
Gender-dropdown issue Briefs 7-8 found) — now clean single labels per language instead of
"In Person / في العيادة"-style concatenation.

Review outcome: `grep '>[A-Z][a-z]'` and RTL-sensitive-class sweeps both 0; 6 of 7 placeholders
translated via `tr.*`, the 7th (`placeholder="0"` on the Amount Paid Now field) correctly left as a
literal digit, not copy, per DEC-043. All 3 `toLocale*` calls confirmed untouched by diffing the
commit. Session type (`in_person`/`online`) and every DB id in the booking payload confirmed still
canonical English. No service names duplicated into `translations.ts` — pulled from the DB's own
`en`/`ar` columns as the brief required. en/ar key parity 410/410 across the whole file. `tsc`/
`eslint` clean (0 errors), `vitest` 597/603 unchanged. Browser-verified live in both languages:
opened New Booking from the Bookings-tab entry point, full form (patient info, appointment details,
session type, notes, amount) renders fully Arabic with Arabic service names pulled correctly from
the DB, English reverts cleanly. The report's manual test checklist was thorough and accurate,
matching the actual wiring exactly (correctly notes 2 render sites, not 1).

**Process note, same pattern as Briefs 13/14 before it:** landed in another oversized commit
(~2,900 lines) sweeping in the same unrelated test-coverage workstream. This one was **already
pushed to `origin/dev`** by the time it was found — could not be safely un-commingled without a
force-push to shared history, which was not done. Content verified correct independently of the
commit hygiene issue. This is now the **third** time in a row a brief's commit has swept in
unrelated content; worth raising as a process question rather than continuing to silently absorb it
each time.

### Brief 15 — Phase 1: extract `Doctors` from `admin/page.tsx` (completed 2026-08-19)

Split into the 4 ordered sub-PRs exactly as scoped: `DoctorAuditLogsModal.tsx` (independent, moved
first), `useProviderForm.ts` (the ~31 shared `providerForm*` fields plus the dead Attendance
plumbing — confirmed moved **verbatim**, not dropped or "finished"), `ProviderFormModal.tsx`, and
`AdminDoctorsView.tsx`. `useProviderForm()` is called exactly once in `page.tsx` and passed as a
single prop to both consumers — no double-hook-call trap. `DoctorServiceCommissionEditor` still
imported from its one canonical location by all three call sites (page.tsx's remaining Services
block, `AdminDoctorsView`, `ProviderFormModal`) — not duplicated.

Review outcome: `tsc`/`eslint` clean (0 errors) across all 4 new files plus `page.tsx`, `vitest`
597/603 unchanged. Browser-verified live: doctors list renders with real data; Audit Logs modal
opens with real schedule-change history (`saifuldeen Naser`, `UPDATED` badges, timestamps); the
inline Edit Doctor view opens with correct per-doctor hydration confirmed via direct DOM inspection
(name and phone fields pre-filled from the actual record, not the placeholder — an empty Specialty
field on one doctor was a red herring, that doctor's own record genuinely has no specialty set, not
a hydration bug — confirmed by comparing against the record's own Profile Details view).

### Brief 16 — Phase 1: extract `Services` from `admin/page.tsx` (completed 2026-08-19)

Single-component extraction into `AdminServicesView.tsx` as scoped — no hook needed, confirmed
self-contained. `localServices`/`setLocalServices`/`syncServicesToApi` passed as props, not moved
(shared with `PromotionsAdminPanel`, per the brief's own flag). `ServiceRecipeEditor`/
`ServiceDeviceEditor`/`DoctorServiceCommissionEditor` all still wired correctly.

Review outcome: `tsc`/`eslint` clean (0 errors), `vitest` 597/603 unchanged. Browser-verified live:
services list renders with real branch pricing; "Add Service" modal opens with the full bilingual
form (Service Name EN/AR, English/Arabic Description, category, duration, price) working correctly.

**Found, not caused, by this extraction — logged as RISK-064:** the "Add New Category" modal has
only one input (English name); `newCategoryNameAr` exists in state/props but was never wired to any
JSX, so every category created there gets a permanently blank Arabic name. Confirmed pre-existing
by diffing the pre-extraction commit — this dead-state pattern already existed in `page.tsx` before
Brief 16 touched it, moved verbatim. Not fixed here (a real feature gap, not a mechanical-extraction
fix); see `ai_docs/RISKS.md` RISK-064 for the exact fix needed.

**Process note:** Briefs 15 and 16 arrived in a single commit mislabeled only as "BRIEF 16",
touching both features' code in the same `page.tsx` diff (16,149 lines changed). Unlike prior
commingling incidents, this one is not cleanly separable after the fact — both extractions
genuinely modified the same file in the same pass, and manually splitting a diff this size would
risk introducing an error that a clean file-level un-commingling wouldn't. Not pushed at the time
this was found, so the option existed, but a risky manual split was judged worse than an accurately
relabeled single commit; verified independently either way. **This is the fourth commingled/
mislabeled commit in a row** (Briefs 5, 13, 14, and now 15+16) — flagged to Mohamed as a pattern
worth addressing at the process level, not something to keep silently absorbing per-brief.

### Brief 17 — Wire Inventory permission enforcement, then extract from `admin/page.tsx` (completed 2026-08-20)

Landed as 5 clean, correctly-labeled commits — Part 1 (permission wiring), Part 2.1 (Device Audit
Logs modal), Part 2.2-2.3 (Devices/Products sub-tabs), Part 2.4 (`AdminInventoryView` wrapper) —
first properly-separated commit sequence since the commingling pattern started at Brief 5.

Review outcome: the 4 permission keys wired exactly as scoped — `canManage` (renamed at each
component boundary from the semantically-named `canManageDevices`/`canManageProducts`/
`canManageSuppliers` booleans computed once in `page.tsx`) gates every write surface in
`InventoryDevicesTab.tsx`, `InventoryProductsTab.tsx`, `SuppliersScreen.tsx`, and
`PurchasesScreen.tsx` via the same `canManage ? "inline-flex" : "hidden"` pattern Services already
used; hard product-delete additionally requires `canManage && isSuperadmin`, unchanged from before.
The read baseline is correctly unconditional — the whole section isn't gated behind any permission,
only the write buttons are. The `inventoryProducts` shared-state finding from the brief was
respected: `page.tsx` passes it (and `fetchInventoryProducts`) down as props, not duplicated into a
locally-owned copy that would have silently diverged from what `useCustomerProfile.ts` (Brief 10/11)
depends on. `tsc`/`eslint` clean (0 errors), `vitest` 597/603 unchanged. Browser-verified live: all
3 tabs (Devices, Products, Suppliers) load real data, Add Device modal opens with all fields, Device
Audit Logs modal shows real history (pulse-count/status changes with timestamps and "Performed By").

**One check not completed this pass, marked Pending rather than assumed:** browser-verifying that a
genuinely restricted account (only `inventory.view`, no `.manage_*` keys) actually renders
read-only — no second test account with that permission shape was available. The code-level pattern
match is the same one already proven correct for Services, giving high confidence, but that is not
the same as watching it render for a real restricted session — flagged in
`ai_docs/manual_tests/BRIEF_17_INVENTORY_PERMISSIONS_AND_EXTRACTION_MANUAL_TESTS.md` as an open item.

**Found, not caused, by this extraction:** `InventoryProductsTab.tsx` carries an orphaned
`handleSearchPatientByPhone` function and two supporting state variables with zero call sites —
confirmed via `git log -S` that this was already dead code in `page.tsx` before Brief 17 touched it,
moved verbatim. Same shape as Brief 15's dead Attendance-tab plumbing; not a new RISK entry, just
noted for whoever eventually does dead-code cleanup in this area.

### Brief 18 — Deduplicate the shared provider-form body, then translate the Doctors ecosystem (completed 2026-08-20)

Landed as 2 clean commits: Part 0 (extract `ProviderFormFields.tsx`), Part 1 (translate all 4
files). Part 0 delivered exactly what it set out to — the ~390-line form body duplicated
byte-for-byte between `AdminDoctorsView.tsx` and `ProviderFormModal.tsx` (confirmed identical by
diffing the Gender `<select>` block character-for-character before starting) now lives once, and
the Gender value/label-separation site count dropped from 3 to 2 as a direct consequence, exactly
as the brief predicted.

Review outcome: `tsc`/`eslint` clean (0 errors), `vitest` 597/603 unchanged, en/ar key parity exact
(477/477) against the commit as authored. The `toLocaleString()` bug (unpinned, silently following
the browser's own locale) is fixed, pinned to `en-GB`. Browser-verified live in both languages:
Doctors list, Edit Doctor inline view (Gender, Session Type, all fields), RTL mirroring on the full
form, clean revert to English.

**Two gaps found and closed, neither structural:** (1) the row-actions dropdown wrapper in
`AdminDoctorsView.tsx` still used `text-left` while its own inner menu correctly used `text-start`
— almost certainly visually inert (icon-only button) but fixed to match the brief's own bar.
(2) The working-schedule day labels (`{day}`, rendered straight from `Object.keys(activeSched)`)
had no translation lookup at all — "Sunday" through "Saturday" stayed English even in Arabic mode.
Not something the brief anticipated when written, and not catchable by `grep '>[A-Z][a-z]'` (an
interpolated expression, not literal JSX text) — found only by reading the actual Arabic render.
Fixed with a `dayNames` lookup added to `providerFormFields`, with the underlying `day` key
(correctly still the canonical English weekday name used to index the schedule object) left
untouched. Manual test checklist: `ai_docs/manual_tests/BRIEF_18_DOCTORS_DEDUP_AND_I18N_MANUAL_TESTS.md`.

### Brief 19 — Phase 2: translate `AdminServicesView.tsx` to Arabic (completed 2026-08-20)

Landed as 1 clean commit. Content and translation quality reviewed directly by Mohamed in the
browser rather than independently re-walked string-by-string — his own read of live Arabic UI text
is faster and more reliable than a code-side check for that specific judgment. Mechanical checks run
on top: `tsc`/`eslint` clean (0 errors, only pre-existing unused-var warnings), `vitest` 597/603
unchanged, en/ar key parity exact (567/567) across the whole `translations.ts`. Status value/label
separation confirmed correct — `<option value="Active">{t.activeOnly}</option>` keeps the stored
value canonical. The 2 pre-existing hardcoded `dir="rtl"` attributes on the Arabic Service Name/
Description text inputs (content-direction hints, not the language toggle) are unaffected, as
expected.

**Found, not caused, by this brief:** a `"Def"` badge abbreviation (default branch-price indicator,
2 occurrences) and a hardcoded `"Zayed:"` fallback label (used only when `svc.branchPricing` isn't
an array) both remain untranslated. Confirmed via diff against the pre-Brief-19 commit that both
already existed before this brief touched the file — not a regression. Low impact, not blocking;
worth a follow-up pass whenever this table is next touched. Manual test checklist:
`ai_docs/manual_tests/BRIEF_19_SERVICES_I18N_MANUAL_TESTS.md`.

### Brief 20 — Phase 2: translate the Inventory ecosystem to Arabic (completed 2026-08-22)

Landed as 1 commit (`78748cb`) covering all 6 target files. Independently re-verified after an
unrelated 60+-commit pull from `origin/dev` landed on top of it and produced 3 merge conflicts
inside Brief 20's own files (`AdminInventoryView.tsx`, `InventoryDevicesTab.tsx`,
`SupplierManagementScreen.tsx`) — all 3 hand-resolved keeping the translation-aware, RTL-safe side
while adopting the unrelated commits' newer pill-style tab UI and a `dropdown-action-menu` CSS fix;
resolution independently re-reviewed and confirmed clean.

Review outcome: `tsc`/`eslint` clean (0 errors) on all 9 touched files, `canManage`/`lang`/`t` prop
wiring intact end-to-end post-merge, dir attribute present on all 7 component roots, `toLocale*`
calls pinned, en/ar key parity structurally proven (props typed as
`typeof adminTranslations["en"]["inventory"]...`, so a missing key is a compile error).

**5 gaps found and fixed, same recurring value/label-in-an-interpolated-expression pattern as
Brief 18's day-names bug** — invisible to `grep '>[A-Z][a-z]'` because none of these are literal
JSX text:
1. Device category shown raw in the devices table (`{dev.category}` → e.g. "Laser Hair Removal" in
   Arabic mode). Fixed with a `categoryLabel()` mapping helper in `InventoryDevicesTab.tsx`.
2. Product category shown raw in the catalog table — same fix pattern in `InventoryProductsTab.tsx`.
3. Maintenance reason shown raw in the reset-history modal (`{log.reason}`) — fixed with a
   `reasonLabel()` helper, `InventoryDevicesTab.tsx`.
4. `DeviceAuditLogsModal.tsx`'s action-type badge rendered the raw `actionType` string instead of
   the already-translated `t.typeXxx` keys — fixed by deriving the label from the existing
   `isReset`/`isCreated`/`isStatus` flags.
5. Hardcoded English word `"delivered"` in a parenthetical pulse-count suffix (Windsurf's own
   self-caught gap, already listed in its draft checklist) — fixed by adding a `deliveredSuffix`
   key to both `en`/`ar`.

All 5 fixes preserve canonical-English stored/compared values — only display sites changed.
Committed separately as `d36753c`. Content and translation quality verified directly by Mohamed in
the browser. Manual test checklist: `ai_docs/manual_tests/BRIEF_20_INVENTORY_I18N_MANUAL_TESTS.md`.

**Reception-first scope is now fully translated** (Bookings, New Booking, Patients, Doctors,
Services, Inventory) — see `ADMIN_REFACTOR_AND_I18N_PLAN.md` for what's next.

### Brief 21 — Phase 1: extract the Employees admin section from `page.tsx` (completed 2026-08-22)

Landed as 1 commit (`34d01a4`), 2,989-line diff (2,949 deletions on `page.tsx`, matching the
~2,225-line block plus surrounding scaffolding). Independently re-verified: `tsc`/`eslint` clean
(0 errors, 267 pre-existing warnings), `vitest` 618/9 unchanged, and every state/handler category
the brief specified traced by grep across both files — every "moves in" identifier fully absent
from `page.tsx`, every "must stay a prop" identifier single-sourced in `page.tsx` and destructured
as a prop (not forked), and the 3 explicitly-out-of-scope handlers (`handleCreateEmployee`,
`handleUpdateEmployeeRole`, `handleSaveDepartments`) confirmed untouched. The permission gate,
both known value/label-separation bugs, and the duplicate `checkShiftOverlaps`/schedule-editor
logic were all moved verbatim, not silently fixed — as instructed. Browser-verified live: Employees
list/profile/Attendance Insights tab, Role Management's "Provision Employee Credentials" form
(confirms `newEmployeeName`/`Email`/`Role` are still correctly shared, not forked), and HR's
Workforce Directory (confirms the 3-way `employeesList` share survived).

**One correct deviation from the brief's literal text, not a bug:** `viewingEmployee` itself (not
just its notes/bookings) stayed lifted in `page.tsx` instead of moving fully into the component —
necessary, because HR's own Payroll tab "View Details" button calls `setViewingEmployee` directly, a
real cross-section dependency the original investigation missed. Brief 22 (queued next) already
assumes this and asks for `setViewingEmployee` to be passed into the future HR component the same
way. Manual test checklist: `ai_docs/manual_tests/BRIEF_21_EMPLOYEES_EXTRACTION_MANUAL_TESTS.md`.

### Brief 22 — Phase 1: extract the HR admin section from `page.tsx` (completed 2026-08-22)

Landed as 1 commit (`c7fb113`), 1,795-line deletion from `page.tsx` into a 1,901-line
`src/components/admin/hr/AdminHrView.tsx`. Independently re-verified: `tsc` clean, `vitest` 618/9
unchanged.

The brief's central risk — that HR lives in **two non-contiguous spans**, the main block plus an
Edit Target modal ~4,300 lines away — was handled correctly: both moved into the one component,
`page.tsx` keeps only the `editingTargetEmployee` state declaration and its prop pass, and the two
adjacent-but-unrelated modals (`presenceModalOpen` / `locationWarningOpen`, which belong to the
global inactivity monitor) were left untouched as instructed. Browser-verified live: all 7 sub-tabs
render, and Targets → Edit Target opens the moved modal with its inputs bound — the exact path that
would have broken had the two spans been extracted independently.

Permission gating preserved verbatim: still `activeNav === "HR"` alone, with zero
`hasPermission`/`adminRole` anywhere inside the new component — deliberately looser than Employees,
and not "fixed" during a zero-behaviour-change move. The known Payroll status-filter bug
(`AdminHrView.tsx:338-339`, "Pending" and "Overdue" are identical conditions so both return the same
rows) was likewise preserved rather than silently corrected, as the brief required — it remains open
and is flagged for a future fix, not a translation brief. Manual test checklist:
`ai_docs/manual_tests/BRIEF_22_HR_EXTRACTION_MANUAL_TESTS.md`.
