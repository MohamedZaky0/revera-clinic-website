# Windsurf Briefs — Revera clinic platform

**One file for all Windsurf work briefs.** New briefs get appended as a new section here; do not
create separate brief files. Completed briefs stay as a short archived record at the bottom.

Standing rules live in `.windsurf/rules/*.md` (loaded automatically) and `.windsurf/MEMORIES.md`.
**Those apply to every brief in this file and are not repeated here.** Read them first.

---

# ACTIVE BRIEF

## Brief 22 — Phase 1: extract the HR admin section from `page.tsx`

**Do not start until Brief 21 (Employees) is committed and independently verified.** HR shares
real state with the Employees component Brief 21 just created (`attendanceList`, `employeesList`,
and a direct cross-section call into Employees' own `setViewingEmployee`) — writing this against a
still-moving target risks grounding it in numbers that shift under you. Re-verify every line number
below against the actual file before starting; they were captured 2026-08-22 immediately after
Brief 21's extraction landed on disk (uncommitted at the time), and this file has a history of
drifting between when a brief is written and when it's picked up.

**Scope: mechanical extraction only. Zero behavior change, no translation, no dedup, no bug
fixes.** Same pattern as Brief 21. HR is smaller (1,568 + 151 lines vs. Employees' 2,225) but has
one structural trap Employees didn't: **its state and one of its own UI pieces are not contiguous
in the file.** Read this whole brief before starting.

**Target file:** new `src/components/admin/hr/AdminHrView.tsx`, following the
`AdminEmployeesView.tsx`/`AdminDoctorsView.tsx` naming convention.

**Block boundaries — TWO separate spans, both must move together:**
1. Main block: `{activeNav === "HR" && (` at `page.tsx:10295` through its matching `)}` at
   `page.tsx:11862` — 1,568 lines. Immediately before it: the `<AdminEmployeesView .../>` call
   (10245–10285). Immediately after its closing `)}` (11862) are **two unrelated modals that are
   NOT part of HR and must not be touched or moved**: the Presence Activity Check overlay
   (`presenceModalOpen &&`, 11865–11889) and the Location Warning modal (`locationWarningOpen &&`,
   11892–11917) — these belong to the global inactivity-monitoring system used by every logged-in
   staff role, not just HR. `Dashboard`'s block starts right after them at `page.tsx:11920`.
2. **Detached "Edit Target" modal, `page.tsx:16190–16340` (151 lines)** — triggered by the Targets
   sub-tab's "Edit Target" button (main block, 11840–11846), gated only by
   `{editingTargetEmployee && (...)}`, sitting ~4,300 lines away near the end of the file next to
   unrelated modals (`activeInfoFeature` starts right after it at 16342). **This must move into the
   same new component as the main block.** If it's left behind, the Targets tab's Edit button will
   set state a orphaned modal was reading, and editing a target/bonus will silently stop working.

**Permission gating — confirmed, looser than Employees, preserve exactly as-is.** Zero
`hasPermission(...)` calls and zero `adminRole` checks anywhere inside either span — the content
gate is just `activeNav === "HR"`, nothing else. The only role check that exists is one level up,
at the sidebar-visibility layer (`permittedSidebarItems`, `page.tsx:872–897`): superadmin sees
everything; `admin`/`HR` roles see the HR nav item via an explicit `item.label === 'HR'` check; a
custom `adminPermissions` array containing the literal string `"HR"` also grants it (no
`hr.xxx`-prefixed fine-grained permission works here, unlike Inventory's `canManage*` pattern).
**Do not invent a `hasPermission` check that doesn't exist today** — this is intentionally
different from Employees' section-level `adminRole === "superadmin"` gate, not an oversight to fix.

**State — 27 HR-exclusive `useState` declarations, all clustered at `page.tsx:944–985`
(comment-labeled "HR Module states" / "Targets sub-tab states" / "Doctor payroll states" /
"Attendance and Activity Monitoring states"). Moves in whole:**
`hrActiveSubTab`, `payrollList`/`loadingPayroll`, `leavesList`/`loadingLeaves`,
`performanceReviews`/`loadingPerformance`, `doctorPayrollList`/`loadingDoctorPayroll`,
`selectedDoctorPayrollMonth`/`doctorPayrollSearchQuery`/`doctorPayrollFilterStatus`/
`doctorPayrollCurrentPage`, `selectedPayrollMonth`/`payrollSearchQuery`/
`payrollFilterDepartment`/`payrollFilterStatus`/`payrollCurrentPage`, `newLeaveEmployeeId`/
`newLeaveType`/`newLeaveStartDate`/`newLeaveEndDate`/`newLeaveReason`, `newReviewEmployeeId`/
`newReviewRating`/`newReviewComments`/`newReviewGoals`, and — because it's read by both spans —
`editingTargetEmployee`/`targetAmountInput`/`bonusPercentageInput`/`targetTypeInput`/
`bonusTypeInput` (set in the main block at 11840–11846, read by the detached modal at
16190–16340 — both pieces of state and the modal that reads it move together into the same file).

**Dead state — move it, but flag it, don't fix it.** `loadingPayroll`, `loadingDoctorPayroll`,
`loadingLeaves`, `loadingPerformance` are all set by their fetchers but never read anywhere in the
JSX — no spinner exists for those 4 tabs (unlike Attendance, which does check `loadingAttendance`).
Same "declared and abandoned" shape already flagged elsewhere in this project; not this brief's job
to add UI for it.

**Must be passed as props, not moved (shared with Employees and/or global, confirmed by file-wide
grep):**
- `attendanceList`/`loadingAttendance` (944, "Attendance and Activity Monitoring states" — 983–984
  by original numbering) — populated by `fetchHrAttendance()`, which is **not called from inside
  the HR JSX at all**; it only runs via the `fetchHrData()` orchestrator (see below) and is also
  passed down to `AdminEmployeesView` for its own Attendance Insights tab. HR's Attendance sub-tab
  just reads the resulting list — pass it as a prop, do not re-fetch inside the new component.
- `activeMissingAlerts` — **not HR-exclusive despite the name.** Rendered inside HR's Attendance
  sub-tab as an "Inactivity Alerts" table (11687–11743) AND separately as a global dismissible
  banner in the main admin shell (`page.tsx:6247–6284`, shown above whichever section is active,
  visible to superadmin/admin/HR regardless of `activeNav`). Pass as a prop; do not fork it into a
  component-local copy.
- `employeesList` — shared with Employees/Role Management per Brief 21; also used here (Workforce
  Directory table, Leave-request employee picker, Review employee picker, Targets tab rows).
- **`setViewingEmployee`** — the Payroll tab's "View Details" row action (10789–10793) calls this
  directly. It's Employees' own drawer-opening setter. Pass it into the new HR component the same
  way `AdminEmployeesView` already receives it, or "View Details" silently breaks.
- `session`, `adminEmail`, `branches`, `localServices`, `allReservations` — global, pass down as
  already done for every other extracted section.

**Latent drift, worth a one-line flag in the extracted file, not a fix here:** HR's own Payroll
department filter (10560–10565) is a hardcoded literal option list (`Doctors`/`Nursing`/`Admin`/
`Reception`/`Lab`), not sourced from the dynamic `departmentsList` that Role Management manages and
Employees consumes — it can silently drift if departments are renamed or added elsewhere.

**Handler functions — all hoisted, all defined OUTSIDE the JSX block, `page.tsx:2066–2211`. None
of them move; pass them down as props exactly like Brief 21 did for `fetchRolesAndEmployees`
etc.:**
`fetchHrPayroll`, `fetchDoctorPayroll`, `fetchHrLeaves`, `fetchHrPerformance` — each called from
inside the HR JSX (refresh actions) but defined outside it. `fetchHrAttendance` is defined outside
and **never called from inside the HR JSX** (only via the orchestrator below). `fetchHrAlerts` is
called from inside HR (the "Resolve" button) but also from the global 30-second polling effect and
the global alerts banner's own dismiss button — not HR-exclusive, pass down. `fetchHrData` is a
`useCallback` orchestrator that `Promise.all`s all of the above plus `fetchRolesAndEmployees()`,
fired by a `useEffect` keyed on `activeNav === "HR"` (2207–2211). **Keep this `useEffect` in
`page.tsx`, same as Brief 21 kept the Employees/HR attendance effect** — don't try to move it into
the new component, just let it keep populating the state that gets passed down as props.

**Structure to preserve exactly — one component, 7 inline sub-tabs, no existing sub-components to
reuse (no `hr/` folder exists yet; everything is hand-rolled, even less hoisted than Employees
was):**

| Sub-tab | Lines | API calls inside |
|---|---|---|
| Overview | 10323–10416 | none (read-only Workforce Directory) |
| Payroll | 10419–10882 | `POST /api/hr/payroll` (10494, run), `PATCH` ×3 (10699 bonus, 10723 deduction, 10805 mark paid) |
| Doctor Payroll | 10885–11216 | `POST /api/hr/doctor-payroll` (10947, run), `PATCH /api/hr/doctor-payroll` (11136, mark paid) |
| Leaves | 11219–11439 | `PATCH /api/hr/leaves` ×2 (11281 approve, 11299 reject), `POST /api/hr/leaves` (11338, submit) |
| Performance | 11442–11604 | `DELETE /api/hr/performance` (11457), `POST /api/hr/performance` (11515) |
| Attendance | 11607–11745 | `PATCH /api/hr/alerts` (11722, resolve) |
| Targets | 11747–11860 | none directly (opens the detached Edit Target modal, which does `PATCH /api/employees` at 16209 — note this reuses the Employees endpoint, not an `/api/hr/*` one, since target/bonus fields live on the employee record) |

**Do NOT do any of the following in this brief:**
- Do not translate anything — future Phase 2 brief.
- Do not deduplicate the Payroll and Doctor Payroll tabs against each other. They're structurally
  similar (search → filter → paginate → table → status badge → Pay action, same visual language)
  but genuinely diverge in columns and are already cleanly non-overlapping in data (Payroll's
  filter explicitly excludes doctors, 10425). Same call as Brief 21 made for the schedule editor —
  this needs a product decision about a canonical shared table component, not a silent merge inside
  an extraction brief.
- Do not fix the Payroll status filter bug found during investigation: selecting "Overdue" and
  selecting "Pending" currently return the exact same rows (both conditions check
  `status === "Paid"` and nothing else, 10451–10453) — only the *badge* color actually distinguishes
  them (10649). Real bug, out of scope for a zero-behavior-change extraction. Flag it in the PR
  description; do not silently correct it.
- Do not touch the value/label-separation sites found during investigation (leave status, payroll
  status, attendance status, shift substring-matching, leave type, target/bonus type) — move them
  as-is. They're documented here for whoever writes the eventual HR translation brief:
  leave status (`"Pending"`/`"Approved"`/`"Rejected"`, compared 11268–11276, displayed raw 11272),
  payroll status (derived label, compared via `isPaid`/date math 10649, displayed raw 10778),
  doctor payroll status (same shape, 11115–11123), attendance status (`rec.status`, 3-way ternary
  11672–11676), shift free-text `.includes("night"/"pm")` matching (10681, 11643–11648 — same class
  of risk Brief 21 already logged for Employees' own `emp.shift`), leave type (dropdown literals,
  11390–11393, no comparison logic but raw display at 11260), target/bonus type (`"reservations"`/
  `"revenue"`, `"percentage"`/`"fixed"`, compared throughout, hardcoded English button labels in the
  detached modal at 16250/16261/16287/16303).

**Method / exit criteria:** identical shape to Brief 21. Pure structural move, no behavior change.
`tsc`/`eslint` clean, `vitest` unchanged, diff on `page.tsx` should be almost entirely deletions
(both spans) plus a single `<AdminHrView .../>` call with props. Manual test checklist per
CLAUDE.md, covering all 7 sub-tabs: Overview directory, Payroll run/edit-bonus/edit-deduction/
mark-paid/filter/search, Doctor Payroll same set, Leaves submit/approve/reject, Performance
create/delete, Attendance log + inactivity alerts resolve, Targets edit (confirming the detached
modal still opens and saves correctly after the move — this is the one thing most likely to break
if the two spans were extracted independently instead of together).

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
