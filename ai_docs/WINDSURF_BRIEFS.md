# Windsurf Briefs — Revera clinic platform

**One file for all Windsurf work briefs.** New briefs get appended as a new section here; do not
create separate brief files. Completed briefs stay as a short archived record at the bottom.

Standing rules live in `.windsurf/rules/*.md` (loaded automatically) and `.windsurf/MEMORIES.md`.
**Those apply to every brief in this file and are not repeated here.** Read them first.

---

# ACTIVE BRIEF

## Brief 18 — Deduplicate the shared provider-form body, then translate the Doctors ecosystem

**Why Part 0 exists:** verifying this brief's original scope found that `AdminDoctorsView.tsx`
(inline edit view) and `ProviderFormModal.tsx` (Add modal) don't just share the Gender/Session-Type
fields — **all 21 `providerForm*` fields they use are identical, confirmed by diffing the field
lists**, and the JSX rendering each field is **byte-for-byte identical** between the two files
(confirmed directly — the Gender `<select>` block, for one example, is character-for-character the
same in both, differing only in indentation). This is Brief 15's own finding (both surfaces read
the same `useProviderForm()` hook) taken one step further: it's not just the *state* that's shared,
the *entire form body* was copy-pasted between the two presentations. Translating it in place would
mean doing the same work twice and — per the last conversation with Mohamed — that duplication
should be eliminated as a component first, matching this whole effort's own DEC-027 philosophy,
rather than patched twice.

### Part 0 — Extract the shared form body into one component (do this first, no translation yet)

**Boundaries (verified by direct read, 2026-08-19 — re-confirm before starting):**
- `AdminDoctorsView.tsx` lines 150–522: the `<div className="space-y-6">` block from "Row 1: Name &
  Specialty" through the end of the working-schedule renderer, immediately before the "Action
  Buttons" comment at line 524.
- `ProviderFormModal.tsx` lines 109–484: the `<div className="flex-1 overflow-y-auto space-y-5
  pr-1">` block, same starting point ("Row 1: Name & Specialty") through the same ending point,
  immediately before the "Footer Actions" comment at line 487.

**What does NOT move — stays in each file as its own wrapper:** the page-level chrome in
`AdminDoctorsView.tsx` ("Back to Doctors" button, `<h1>Edit Doctor: {name}</h1>` heading, "Save
Changes" button) and the modal-level chrome in `ProviderFormModal.tsx` (modal header/close button,
"Cancel"/"Save Changes"/"Add Provider" footer — the button label itself depends on
`providerModalMode`, which correctly lives outside the shared body). Also stays in
`AdminDoctorsView.tsx`: the doctors list/table and its own filter panel — the filter panel's Gender
dropdown (`providerFilterGender`, ~line 632) is a **different control for a different purpose**
(filtering the list, not editing a doctor) and is **not** part of this consolidation, even though it
has the same `<option value="Male">`/`<option value="Female">` shape.

**Scope:** extract the two identical blocks into `src/components/admin/doctor/ProviderFormFields.tsx`,
taking `providerForm` (the whole `useProviderForm()` return value, already threaded through both
call sites per Brief 15) as its prop, same pattern as everywhere else. `AdminDoctorsView.tsx` and
`ProviderFormModal.tsx` each render `<ProviderFormFields providerForm={providerForm} .../>` inside
their own remaining chrome. `DoctorServiceCommissionEditor` (used inside the shared body) moves with
it, imported from its existing canonical location — no change to that component.

**Method:** no behaviour change, no renames beyond the new file, no translation yet — pure
mechanical move, same rules as Briefs 5/10/11/15/16. `npm run check` green. Browser-verify both
surfaces still work identically: edit an existing doctor via the inline view, add a new doctor via
the modal, confirm every field (name, specialty, phone, national ID, gender, branches, start date,
rating, image, commission/services editor, working schedule for both in-person and online) still
reads and saves correctly from both entry points.

**Exit criteria for Part 0:** neither `AdminDoctorsView.tsx` nor `ProviderFormModal.tsx` contains
the duplicated field JSX anymore; both render `<ProviderFormFields />`; `npm run check` green;
both entry points browser-verified working identically to before. Commit this before starting Part 1.

### Part 1 — Translate (after Part 0 lands and is verified)

**Target — now 4 files instead of 3, but the duplication is gone:**
`src/components/admin/doctor/ProviderFormFields.tsx` (the new shared body — translate once here,
not twice), `src/components/admin/doctor/AdminDoctorsView.tsx` (now just the list + filter panel +
page chrome), `src/components/admin/doctor/ProviderFormModal.tsx` (now just the modal chrome),
`src/components/admin/doctor/DoctorAuditLogsModal.tsx` (146 lines, unchanged by Part 0). None
currently take a `lang` prop or have a `dir` attribute.

**Re-measure string/placeholder/RTL-class counts once Part 0 lands** — the original counts below
were taken pre-consolidation and will have shifted (most of `AdminDoctorsView.tsx`'s and
`ProviderFormModal.tsx`'s counts move into `ProviderFormFields.tsx`):
| File (pre-Part-0 baseline, 2026-08-19) | Hardcoded strings | Placeholders | RTL classes |
|---|---|---|---|
| `AdminDoctorsView.tsx` | ~34 | 8 | `text-left`×6, `left-3.5`, `pl-10`, `pr-4`, `right-0`, `right-1` |
| `ProviderFormModal.tsx` | ~16 | 7 | `pr-1`×1 |
| `DoctorAuditLogsModal.tsx` | ~9 | 0 | `pr-1`×1 |

As always, the grep count is a floor — enumerate by reading each file.

**Value/label separation — now 2 sites instead of 3, both genuinely necessary:**
`ProviderFormFields.tsx`'s Gender `<select>` (the single shared copy — was duplicated at
`AdminDoctorsView.tsx:210-211` and `ProviderFormModal.tsx:169-170` before Part 0, now translate it
once) and `AdminDoctorsView.tsx`'s **filter-panel** Gender dropdown (~line 632, `providerFilterGender`
— genuinely separate, filters the list rather than editing a record, not touched by Part 0).
Translate both via the same `t.genderMale`/`t.genderFemale` lookup already established for
`CustomerFormModal.tsx` (Briefs 7-8) — **keep `value="Male"`/`value="Female"` unchanged**, they feed
`providerFormGender`/`providerFilterGender` which must stay canonical.

Also translate the Session Type toggle inside `ProviderFormFields.tsx` (`providerFormScheduleTab`,
`"in_person" | "online"` — now only one copy, was duplicated before Part 0) the same way Brief 14
fixed New Booking's Session Type cards — translate the label, never the stored value.

**A real bug to fix as part of this brief, not just a translation nicety:**
`DoctorAuditLogsModal.tsx:108` calls `new Date(log.created_at).toLocaleString()` with **no locale
argument at all** — unlike every other date-formatting call in this codebase (all pinned to
`en-GB`/`en-US`), this one silently follows whatever locale the admin's own browser/OS happens to
be set to. That's already a latent inconsistency across different staff machines, and it means
adding Arabic language support elsewhere in the file makes this one spot *more* likely to drift
into Arabic-formatted digits/months by accident (the browser locale is a separate, unrelated
setting from this admin panel's own `lang` toggle). **Pin it explicitly to `en-GB` or `en-US`
matching the surrounding convention** — this is a fix, not something to leave alone the way the
already-pinned calls elsewhere must be left alone.

**Dates that ARE already pinned — leave these alone:** no other `toLocale*` calls exist across
these 4 files (confirmed by grep pre-Part-0) — exactly one date-formatting call total, and it's the
broken one above.

**Method:** `dir={lang === "ar" ? "rtl" : "ltr"}` on each component's own root — per component, same
as everywhere else, including on the new `ProviderFormFields.tsx`. Note: `AdminServicesView.tsx` (a
sibling file, not in this brief) has 2 hardcoded `dir="rtl"` attributes on its Arabic-name/
description *text inputs* — if you see the equivalent pattern anywhere in these 4 Doctor files (an
Arabic-content input field, not a UI-language toggle), that is a content-direction hint for typing
Arabic text and is unrelated to this brief's `lang`/`dir` wiring — do not remove or confuse it with
the translation toggle.

**Exit criteria:** same as every prior Phase 2 brief — `grep '>[A-Z][a-z]'` and
`grep 'placeholder='` return only intentional non-copy matches across all 4 files; all RTL classes
converted to logical properties; the `toLocaleString()` bug fixed; Gender/Session-Type value/label
separation correct in both remaining sites; browser-verified in both languages (open Doctors, edit
a doctor via the inline view, open Add Doctor via the modal, open Audit Logs — all in Arabic);
manual test checklist written per CLAUDE.md.

## Brief 19 — Phase 2: translate `AdminServicesView.tsx` to Arabic

**Target:** `src/components/admin/services/AdminServicesView.tsx` (1,171 lines — the largest single
translation target after `CustomerProfileDrawer.tsx`). No `lang` prop or `dir` attribute today.

**Measured scope (grepped 2026-08-19, re-confirm):** ~44 hardcoded strings, 7 placeholders,
RTL classes = `text-left`×11, `left-3.5`, `ml-1`, `pl-9`, `pr-4`, `right-0`, `right-1`.

**Already present, not part of this brief's scope:** 2 hardcoded `dir="rtl"` attributes at lines
945 and 970, on the Arabic Service Name / Arabic Description text inputs. These make sense as-is —
an input for typing Arabic content should stay RTL regardless of the admin's own UI language — do
not touch them, do not confuse them with the `lang`/`dir` wiring this brief needs to add to the
component's own root.

**Value/label separation:** service active/inactive status appears in 3 different renderings that
must all translate consistently while `toggles.active` stays a boolean (no stored-string risk here,
simpler than Gender/status-string cases) — a status badge (`{toggles.active ? "Active" :
"Inactive"}`, ~line 535), a dropdown filter (`<option value="Active">Active Only</option>` /
`<option value="Inactive">Inactive Only</option>`, ~lines 263-264 — **keep the `value=` attributes
English**, `serviceFilterStatus` compares against them directly), and a menu action label pair
(`{toggles.active ? "Deactivate" : "Activate"}` + a second small badge `{toggles.active ? "Active" :
"Off"}`, ~lines 584-587 — note this one says **"Off"**, not "Inactive", a different string for the
same boolean state; translate both without conflating them into one key).

**Dates:** exactly 1 `toLocale*` call (line 1132, building a new service's `createdAt` string) —
already correctly pinned to `en-GB` for both the date and time parts. Leave it exactly as-is, per
DEC-043.

**Method / exit criteria:** identical to Brief 18 — per-component `dir`, logical RTL properties,
value/label separation confirmed on all 3 status renderings, both languages browser-verified (list
view, Add/Edit Service form, Add Category modal, filter panel), manual test checklist written.

## Brief 20 — Phase 2: translate the Inventory ecosystem to Arabic

**Do not start this until Brief 17 Part 2 has landed.** This brief is written against Brief 17's
*planned* component structure so it's ready the moment extraction finishes — the file paths below
don't exist yet as of 2026-08-19. Re-verify every path and line-count claim once Brief 17 is done;
treat everything here as provisional scope, not measured fact, until then.

**Expected targets, per Brief 17 Part 2's scope:** `src/components/admin/inventory/
AdminInventoryView.tsx` (top-level wrapper), `InventoryDevicesTab.tsx`, `InventoryProductsTab.tsx`,
`DeviceAuditLogsModal.tsx`, plus the already-existing `SupplierManagementScreen.tsx` (and its
children `SuppliersScreen.tsx`/`PurchasesScreen.tsx`) — **these 3 supplier files predate this whole
i18n rollout and need the same `lang`/`dir` wiring added, they are not exempt just because they
were already extracted**.

**Known from Brief 17's own investigation, carries over here:** the devices and products domains
don't share state (confirmed in Brief 17), so unlike Brief 18 there's likely no cross-file
duplicate-field risk to chase — but re-confirm once the files exist, don't assume Brief 17's
pre-extraction analysis of `page.tsx` still holds true post-extraction.

**Value/label separation candidates to check once the files exist (not yet confirmed against real
code — this is a prediction, verify it):** device/product status fields (active/inactive, low-stock
indicators), any payment or supplier-status enums in the Suppliers/Purchases screens. Apply the
same rule as every prior brief: translate the label, never a value compared in logic or written
back via POST/PATCH.

**Permission-gating interaction:** Brief 17 Part 1 will have added `hasPermission("inventory.view"
/".manage_devices"/".manage_products"/".manage_suppliers")` checks with conditional rendering
(`hasPermission(...) ? "inline-flex" : "hidden"`, matching the Services convention). When adding
`t.*` lookups to those same buttons, **do not accidentally remove or restructure the permission
conditional** — the translated label and the permission gate apply to the same element
independently; changing one must not regress the other. Browser-verify with both a full-access and
a view-only permission grant in Arabic, not just in English.

**Dates:** none measured yet — check for `toLocale*` calls once the files exist and confirm they're
pinned to `en-GB`/`en-US` per DEC-043 (or fix them the way Brief 18 fixes
`DoctorAuditLogsModal.tsx`'s unpinned one, if the same gap exists here).

**Method / exit criteria:** identical shape to every prior Phase 2 brief. Manual test checklist
written per CLAUDE.md, including a pass with a view-only Reception-style permission grant.

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
