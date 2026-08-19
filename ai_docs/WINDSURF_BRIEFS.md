# Windsurf Briefs — Revera clinic platform

**One file for all Windsurf work briefs.** New briefs get appended as a new section here; do not
create separate brief files. Completed briefs stay as a short archived record at the bottom.

Standing rules live in `.windsurf/rules/*.md` (loaded automatically) and `.windsurf/MEMORIES.md`.
**Those apply to every brief in this file and are not repeated here.** Read them first.

---

# ACTIVE BRIEF

## Brief 14 — Phase 2: translate `AdminNewBookingView.tsx` to Arabic

**Brief 13 landed 2026-08-19 — see its archive entry below** (`bookings` top-level namespace now
exists, extend it here, don't duplicate). Same situation and same reasoning as Brief 13 — already
extracted, never translated, zero Arabic wiring today. **Phase 2 only, no extraction.**

**Target:** `src/components/admin/bookings/AdminNewBookingView.tsx` (1,123 lines).

**Measured scope (grepped 2026-08-19, re-confirm):** ~38 hardcoded strings, **7 `placeholder`
attributes** (unlike Brief 13 — this is a form-heavy screen, so placeholders and any validation /
`alert()` copy matter here), RTL-sensitive Tailwind = `text-right` ×8, `right-0` ×1, `pr-3` ×1,
`left-0` ×1.

**Wiring:** add `lang`/`t` props and a `bookings.adminNewBookingView` namespace. If Brief 13 landed
first it will already have created the `bookings` top-level namespace — extend it, don't duplicate
it. Pass props from `admin/page.tsx` at its render sites (~21740 and ~21804 — again, more than one).

**Value/label separation:** session type (in-clinic / online), payment method, and any service or
branch identifier must keep English/DB values. Service names come from the DB and already have
`en`/`ar` columns — use those, do not copy service names into `translations.ts`.

**Dates:** 3 `toLocale*` calls — leave hardcoded.

**Method / exit criteria:** identical to Briefs 12-13. Browser-verify by actually creating a booking
in Arabic end-to-end and confirming the created record's stored fields are English.

---
---

# QUEUED BRIEFS — do these next, in this order

## Brief 15 — Phase 1: extract `Doctors` from `admin/page.tsx`

**Why this exists:** DEC-043's 2026-08-19 correction added Doctors to Reception scope (Reception
already gets a read-only view today via existing `providers.edit`/`.delete` permission gates — see
the correction note for the investigation). This brief does extraction only, no translation, same
extract-then-translate split as every other section. **Read this whole brief before starting —
unlike every prior Phase 1 brief, this section is not one contiguous block.**

**The ecosystem is scattered across 3 separate regions of `page.tsx` (verified by direct read,
2026-08-19 — re-confirm line numbers, other work has been landing on this file):**

1. **Main `activeNav === "Doctors"` block**, lines 7711–8372 (~661 lines). Three-way conditional:
   `viewingDoctorDetails` → already-extracted `<DoctorProfileDetailsView />` (just a call, no
   change needed) · `editingDoctorInline` → a full-page inline edit form (~406 lines) · else → the
   doctors list/directory (~246 lines, includes an "Audit Logs" button and per-row Edit/Delete
   actions gated by `hasPermission("providers.edit"/".delete")`).
2. **Add/Edit Provider modal**, lines 22897–23318 (~421 lines) — over 14,000 lines away from the
   block above. Opened only via `openAddProviderModal()` (line 5158) for **adding** a new doctor.
3. **Audit Logs modal**, lines 23509–23624 (~115 lines) — also far away. Opened only from the
   list's "Audit Logs" button. Fully self-contained: own state (`showAuditLogsModal`, line 4295)
   and fetcher (`fetchAuditLogs()`, line 5054), not shared with anything else in this ecosystem.

**Critical finding — regions 1 and 2 share one set of ~31 state variables, don't split them
naively.** The inline edit form (region 1) and the Add/Edit modal (region 2) both read/write the
identical `providerForm*` state block (lines 4255–4294: name, rating, commission fields, working
hours, branch schedules, etc. — confirmed by grep, both regions reference the same 20 field names).
This is **not** two unsynced editors (not a RISK-045 situation) — it's one shared form whose
presentation differs by context: `openAddProviderModal()` shows the modal for new doctors;
`openEditProviderModal(provider)` (misleadingly named — it actually sets `editingDoctorInline` and
**closes** the modal, line 5210) routes existing-doctor edits to the inline full-page view instead.
Both funnel into the same `handleSaveProvider()` (lines 5290–5473) and `handleDeleteProvider()`
(lines 5475–5496). Renaming `openEditProviderModal` to something accurate is optional, not required
by this brief — use judgement, don't let it expand scope.

**Also found while investigating — dead/orphaned code, move it, don't complete it or drop it:**
`providerTab` (`"Doctors" | "Attendance"`, line 1555), `attendanceDate`/`attendanceRecords`
(lines 4299–4303), and `fetchAttendance()` (line 5065) have full data-fetching plumbing — including
a permission-normalisation effect (lines 2199–2208) and a fetch-trigger effect (lines 5115–5118) —
for what looks like a planned "Attendance" sub-tab on the Doctors screen. **Confirmed by exhaustive
grep: zero JSX anywhere renders `providerTab`, `attendanceRecords`, or an Attendance tab.** It is
declared and fetched but never displayed — the same shape of gap as DEC-042's `attachedProducts`
and the dead `lang` state Brief 6 found. Move this state/logic verbatim wherever it ends up (do not
silently delete it, do not invent UI to "finish" it) and flag it in your completion report so a
human can decide later whether to build the missing tab or delete the plumbing.

**Scope — 4 ordered sub-PRs, same reasoning as Brief 5/10/11 (shared state can't be split from its
two consumer UIs without lifting it to a hook first), each its own commit:**
1. **Audit Logs modal** → `src/components/admin/doctor/DoctorAuditLogsModal.tsx` (or similar).
   Fully independent of the `providerForm*` state — safe to do first, proves the pattern for this
   section the same way Brief 5's Sub-PR 1 did for Patients.
2. **`useProviderForm` hook** (or similar name) → move all `providerForm*` state (lines 4255–4294),
   `providers`/`editingDoctorInline`/`viewingDoctorDetails`/`showProviderModal`/`providerModalMode`/
   `providerEditingId` (lines 4103, 4244–4254), the provider filter/search state (lines 4307–4311),
   the dead Attendance plumbing (moves here too, still unused), and the 4 handlers
   (`openAddProviderModal`, `openEditProviderModal`, `handleSaveProvider`, `handleDeleteProvider` —
   NOT `fetchAuditLogs`, that stays with Sub-PR 1) into `src/components/admin/doctor/useProviderForm.ts`.
   `page.tsx` calls this once and passes the result to both consumers as props — same
   no-double-hook-call rule as Brief 10.
3. **Add/Edit Provider modal JSX** → `src/components/admin/doctor/ProviderFormModal.tsx`, consuming
   the hook's output as props.
4. **Main Doctors list + inline edit view JSX** → `src/components/admin/doctor/AdminDoctorsView.tsx`,
   same props pattern. `DoctorServiceCommissionEditor` (already extracted, also used elsewhere —
   Services and doctor payroll) is imported as-is, no changes needed to it.

**Method:** no behaviour change, no renames (beyond the optional one noted above), no translation.
`npm run check` green after every sub-PR. Browser-verify each sub-PR before moving to the next:
list loads, Add Doctor (modal) and Edit Doctor (inline) both save correctly to the same record
shape, Delete Doctor works, Audit Logs opens and loads entries.

**Exit criteria:** `admin/page.tsx` no longer declares any of the state/JSX above directly; all 4
new files render/behave identically to today; `npm run check` green on the final sub-PR.

## Brief 16 — Phase 1: extract `Services` from `admin/page.tsx`

**Why this exists:** same DEC-043 correction as Brief 15. Reception already gets a read-only view
today via existing `services.create`/`.edit`/`.delete` permission gates.

**Target:** `src/app/admin/page.tsx`, `activeNav === "Services"` block, lines 8375–9370
(~995 lines). **Unlike Doctors, this section is a single contiguous block** — verified by grep that
every piece of state it touches (`editingService` line 1721, `showAddCategoryModal` line 1705,
`newCategoryNameEn`/`newCategoryNameAr` line 1708–1709, `deleteServiceTarget` line 1722) is declared
once and referenced **only** inside this block, nowhere else in the file. No hidden cross-section
sharing to investigate, no scattered modals elsewhere — this is a Brief-4-shaped extraction, not a
Brief-5-shaped one.

**Internal structure, all self-contained within the one block:** the services list/catalog view,
an inline Add/Edit Service form (`editingService`), an Add Category modal (`showAddCategoryModal`,
~line 8920), and a delete-confirmation modal (`deleteServiceTarget`, ~line 8877). Two
already-extracted components are consumed here as-is (no changes needed):
`ServiceRecipeEditor`/`ServiceDeviceEditor` (rendered when `editingService` is set) and
`DoctorServiceCommissionEditor` (also used by Doctors and doctor payroll elsewhere — shared, don't
duplicate it).

**Shared/page-level state this block needs as props, not moved:** `localServices`/
`setLocalServices` and `syncServicesToApi` — these are genuinely page-level (already passed into
`PromotionsAdminPanel` the same way), not Services-specific state to extract.

**Scope:** move the whole block into `src/components/admin/services/AdminServicesView.tsx`
(single component, single PR — no sub-PR breakdown needed given the self-containment above). Move
`editingService`, `showAddCategoryModal`, `newCategoryNameEn`, `newCategoryNameAr`,
`deleteServiceTarget`, and their handlers together with it.

**Method:** no behaviour change, no renames, no translation. `npm run check` green.

**Exit criteria:** `admin/page.tsx` no longer declares the state above or the JSX directly; renders
`<AdminServicesView ... />` instead; behaves identically; browser-verify: list loads, add/edit/
delete a service, add a category, recipe/device/commission editors still open correctly from within
the edit form.

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


**Process note:** Windsurf began Brief 13 in the same working tree while this verification was
running, so its in-progress `bookings.adminBookingsView` keys were already sitting uncommitted in
`translations.ts` — the same file this fix touches. Rather than repeat Brief 5's commit
commingling, only this change's own hunks were staged (built against `HEAD` and staged via
`update-index`), leaving Brief 13's work untouched in the working tree for its own commit.
