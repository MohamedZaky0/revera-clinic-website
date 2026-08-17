# Windsurf Briefs — Revera clinic platform

**One file for all Windsurf work briefs.** New briefs get appended as a new section here; do not
create separate brief files. Completed briefs stay as a short archived record at the bottom.

Standing rules live in `.windsurf/rules/*.md` (loaded automatically) and `.windsurf/MEMORIES.md`.
**Those apply to every brief in this file and are not repeated here.** Read them first.

---

# ACTIVE BRIEF

## Brief 7 — Translate MedicalFormModal.tsx (written 2026-08-17)

**Read first:** Brief 6's archived entry below (Part A's shared setup — language state, toggle,
`adminTranslations` — already exists, not repeated here) and `ADMIN_REFACTOR_AND_I18N_PLAN.md`
Phase 2 (2.1–2.4).

**Scope:** `src/components/admin/patients/MedicalFormModal.tsx` (~315 lines). Add
`patients.medicalFormModal` namespace to `src/components/admin/translations.ts`. Update the render
call at `admin/page.tsx:12228` to pass `lang={lang}` and
`t={adminTranslations[lang].patients.medicalFormModal}` (matching Brief 6's pattern exactly).

**Every hardcoded string, enumerated by reading the file directly:**

| Key | Current (EN) string |
|---|---|
| `title` | "Patient Medical & Aesthetic Intake Form" |
| `subtitle` | "Record clinical history, skin classification, medical background & allergies" |
| `skinClassificationLabel` | "Skin Classification" |
| `primaryConcernsLabel` | "Primary Aesthetic Concerns" |
| `otherConcernsLabel` | "Additional Concern Details / Notes" |
| `otherConcernsPlaceholder` | "e.g. Melasma around cheeks, sensitive under-eye area..." |
| `previousTreatmentsLabel` | "Previous Aesthetic Treatments" |
| `previousTreatmentsHint` | "Botox, Fillers, Lasers, Chemical Peels, Microneedling, etc." |
| `previousTreatmentsPlaceholder` | "List past procedures, approximate dates, and any adverse reactions..." |
| `medicalConditionsLabel` | "Existing Medical Conditions / Pregnancy" |
| `medicalConditionsHint` | "Diabetes, Hypertension, Autoimmune, Pregnancy, Nursing, etc." |
| `medicalConditionsPlaceholder` | "Specify conditions..." |
| `medicationsLabel` | "Currently Taking Medications" |
| `medicationsHint` | "Roaccutane/Isotretinoin, Blood thinners, Retinoids, Antibiotics, etc." |
| `medicationsPlaceholder` | "List active medications..." |
| `allergiesLabel` | "Known Allergies (Drugs / Skincare Ingredients / Latex)" |
| `allergiesPlaceholder` | "e.g. Penicillin, Aspirin, Fragrance, Hydroquinone, Latex..." |
| `yesBtn` / `noBtn` | "Yes" / "No" (each reused 3×, same key every time — don't duplicate per section) |
| `cancelBtn` | "Cancel" |
| `saveBtn` | "Save Medical Intake Form" |
| `savingBtn` | "Saving..." |
| `saveFailedAlert` | "Failed to save medical intake form." |
| `saveErrorAlert` | "An error occurred while saving." |

**Important — value vs. label separation, do not change the data shape:** the 5 skin types
(`Normal`/`Dry`/`Oily`/`Combination`/`Sensitive`) and 7 concern tags (`Acne & Blemishes`,
`Pigmentation & Dark Spots`, `Aging & Fine Lines`, `Dullness & Uneven Tone`, `Rosacea & Redness`,
`Enlarged Pores`, `Sagging & Loss of Volume`) are stored in state (`formSkinType`,
`formMainConcerns`) **as these exact English strings**, and sent to the API verbatim (`skin_type`,
`main_concerns` in the payload). **Keep the stored/sent values in English, unchanged** — only
translate what's *displayed* on each button, via a lookup object (e.g.
`t.skinTypes["Normal"]` / `t.concerns["Acne & Blemishes"]`), the same principle as service names
elsewhere in this codebase (DB `en`/`ar` columns, not duplicated data). Changing the stored value
itself would be a real behaviour change (breaks whatever reads `medical_records.skin_type` expecting
English) and is explicitly out of scope.

**RTL audit:** grep the file for `ml-`/`mr-`/`text-left`/`text-right`/`rounded-l-`/`rounded-r-` —
if any exist, note them for a from-the-browser visual check same as Brief 6's requirement; if none,
still confirm visually, not just by the grep (per Brief 6's own lesson).

**Method and exit criteria:** identical to Brief 6's Part B (add `lang`/`t` props, replace strings,
add `dir` to the root, `grep -n '>[A-Z]'` returns nothing, `npm run check` green, browser-verify
both languages including the Yes/No toggles and the skin-type/concern button labels specifically
since those are the value/label-separation case unique to this component).

---
---

# QUEUED BRIEFS — write up next, in this order

## Brief 8 — Translate CustomerFormModal.tsx

**Scope:** `src/components/admin/patients/CustomerFormModal.tsx` (~293 lines, the largest of the
three remaining — do this one after Brief 7, not first). Add `patients.customerFormModal` namespace.
Update the render call at `admin/page.tsx:12255`.

**~40 strings — enumerate by reading the file directly** (this brief does not repeat a full table;
the file is straightforward form labels/placeholders/buttons, same mechanical pattern as Briefs 6–7).
Specific things confirmed while scoping this brief that need deliberate handling, not just literal
translation:

- **Two conditional headings carry logic, not just text:** `{selectedCustomerForEdit ? "Edit
  Customer Details" : "Add New Customer"}` and `` {selectedCustomerForEdit ? `Editing profile of
  ${custName}` : "Create a new customer profile"} `` — translate both branches as separate keys
  (`editTitle`/`addTitle`, `editSubtitle`/`addSubtitle`), keep the `${custName}` interpolation (a
  real name, never translated) working inside the Arabic string too.
- **Validation error strings are real user-facing copy, not just labels** — all 5 (`"Customer name
  is required."`, `"Mobile number is required."`, the two Egyptian-mobile-format messages, `"An
  error occurred while saving the customer."`) need translation keys; they're currently rendered
  inline in a red error box (`customerFormError` state), not `alert()`, but still user-facing.
- **`Gender` dropdown already has a pre-existing, malformed attempt at bilingual support** — the
  options are literally `<option value="Male">Male / ذكر</option>` and `<option value="Female">Female
  / أنثى</option>` (`CustomerFormModal.tsx:207-208`), cramming both languages into one permanently-
  visible string regardless of toggle state. **Fix this as part of this translation work** (it's the
  exact field being translated, not a tangential unrelated bug): keep `value="Male"`/`value="Female"`
  unchanged (stored data), display only `t.genderMale`/`t.genderFemale` (`"Male"`/`"ذكر"` and
  `"Female"`/`"أنثى"` respectively) based on `lang`.
- **Referral Source dropdown (8 options: Facebook, Instagram, TikTok, Google Search, Friend / Word
  of Mouth, Walk-in, Website, Other)** — same value/label separation as Brief 7's skin
  types/concerns: keep the stored `value=` attributes in English (this is what gets POSTed as
  `referral`), translate only the visible option text via a lookup object.

**RTL audit:** the form is a plain `grid`/`space-y` layout, no `ml-`/`mr-`/`text-left` spotted on a
first read — confirm by grep and by eye per the established method.

**Method and exit criteria:** identical to Briefs 6/7.

## Brief 9 — Translate PatientsDirectoryView.tsx

**Scope:** `src/components/admin/patients/PatientsDirectoryView.tsx` (~339 lines, purely
presentational — no local state, everything via props). Add `patients.directoryView` namespace.
Update the render call at `admin/page.tsx:12265`. This component's props interface has **no
`lang`/`t` fields today** — add them like every other component in this rollout.

**Strings to enumerate directly from the file:** header title/subtitle, "Total Patients:" counter
label, "Add Patient" button, "More Actions"/"Export Patients"/"Import Patients" menu, search
placeholder, "Filter" button title, the 3 filter-panel labels (Gender/Status/Referral Source) +
their "All ..." default options + "Clear Filters", table headers (Customer/Created At/
Bookings/Active), "No customers found." empty state, "Active"/"Inactive" status pill, row action
menu ("Actions" title, "Edit Patient", "View Profile").

**Value/label separation again, two places:**
- Gender filter dropdown values (`Male`/`Female`) — same fix as Brief 8's Gender field: keep
  `value=` in English, translate the visible option text. Do this consistently with whatever key
  naming Brief 8 lands on for the same concept, so the two don't diverge (check Brief 8's translation
  keys before naming this one's).
- Referral Source filter's option **values here don't match Brief 8's CustomerFormModal list** —
  this file's options are `Google`/`Facebook`/`Instagram`/`Friend`/`Doctor Referral`/`Walk-in`/
  `Other` (7, different value set — e.g. `Google` not `Google Search`, no `TikTok`/`Website`, and
  `Doctor Referral` doesn't appear in the other file at all). **This mismatch is pre-existing, not
  something this translation brief introduces** — flag it as a separate follow-up (the filter and
  the create-form disagreeing on referral source values is a real, if minor, data-consistency risk
  worth its own RISK entry), and translate each list's actual current values as-is without trying to
  reconcile them in this brief.

**RTL — this is the first component in the rollout with real direction-sensitive Tailwind, confirmed
by reading the file (Brief 6/7 had none):**
- `left-3.5` on the search icon (line 135) and `pl-10 pr-4` on the search input (line 141) — under
  RTL the icon and its padding need to be on the *end* side, not stay pinned left. Prefer logical
  properties (`start-3.5`, `ps-10 pe-4`) per the plan's own 2.3 guidance, or conditional classes if
  the codebase doesn't already lean on logical properties elsewhere — check what pattern (if any)
  `globals.css`/other RTL-aware components already use before picking one.
- `text-left` on table headers (lines 233-234) and on the two row-action-menu buttons (lines 308,
  321) — should flip to the reading-start side under RTL.
- The row-action dropdown (`absolute right-0`, line 299) and the header's more-actions dropdown
  (`absolute right-0`, line 98) — anchor side needs a visual check in the browser; may or may not
  need to flip depending on how it actually reads in RTL, this is a judgement call the grep can't
  make.

Confirm every one of these visually in the browser under Arabic, not just by inspecting the diff —
this component is exactly the "tables, drawers and the sidebar are where RTL usually breaks first"
case the plan itself warned about.

**Method and exit criteria:** identical to Briefs 6–8, plus the RTL items above must be visually
confirmed correct (not just "no crash") before calling this done.

## Brief 10 — Sub-PR 5 (Customer Profile Drawer): move `viewingCustomerProfile` state out of `admin/page.tsx`

**Read first:** Brief 5's archived entry (why this was deferred) and the correction below — the risk
Brief 5 flagged turned out to be smaller than assumed.

**Investigation done while queuing this brief (2026-08-17) — corrects Brief 5's own assumption:**
Brief 5 counted 82 references to `viewingCustomerProfile` file-wide and flagged it as "almost
certainly read/set from places outside the Patients block too... needs enumerating." Enumerated now:

- Current count: 80 references (down slightly — some consolidated into the 4 already-extracted
  components' props). 42 fall inside the current `activeNav === "Patients"` JSX block
  (`admin/page.tsx:10942–12293`); 38 fall outside it.
- **Every single one of those 38 "outside" references is `viewingCustomerProfile`'s own supporting
  logic** — `useEffect`s and handler functions (fetching prescriptions, medical records, product
  balances, package redemptions; selling a package; adding a product to a patient) that are
  *declared* earlier in the file (functions/hooks conventionally sit above the JSX that uses them)
  but are logically part of the Profile Drawer's own behaviour, not some other section's.
- **Confirmed by two separate greps that this state is not actually cross-section shared:**
  `grep -n "setViewingCustomerProfile("` across all of `src/` finds it called **only** inside
  `admin/page.tsx` and the already-extracted `src/components/admin/patients/*.tsx` files — never
  from Bookings or anywhere else. `grep -rln "viewingCustomerProfile"` across all of `src/` returns
  the exact same two locations — the value isn't even *read* anywhere outside Patients-related code.
- **Conclusion: `viewingCustomerProfile` and its ~10 supporting effects/handlers can move out of
  `admin/page.tsx` together**, not stay lifted at the parent as Brief 5 assumed. This significantly
  de-risks Sub-PR 5 compared to how it was scoped before.

**This brief's scope — Part 1 only, not the full Profile Drawer extraction:** move the state
(`viewingCustomerProfile`/`setViewingCustomerProfile`, `1581`) and its ~10 directly-related
`useEffect`s/handlers (prescriptions fetch `~1865-1908`, product sales/balances `~3935-3962`,
package fetches/redemptions `~3989-4015`, sell-package handler `~4055-4104`, add-product-to-patient
handler `~4118-4159`, prescription-save handlers `~6926-6984` — confirm each is actually only
`viewingCustomerProfile`-related and not shared with something else while moving, same
self-containment check every prior brief has used) out of `admin/page.tsx`, into a new
`src/components/admin/patients/useCustomerProfile.ts` custom hook (or directly into the eventual
drawer component, if that's cleaner once you're looking at it — use judgement, this brief doesn't
mandate the exact file shape, only that the logic leaves `admin/page.tsx`).

**Deliberately not in this brief's scope:** actually extracting the ~1,280 lines of Profile Drawer
JSX itself (the 5 sub-tabs — info/history/prescriptions/products/packages — and 3 nested modals:
`logUsageModalBalance`, `showAddPatientProductModal`, `showSellPackageModal`, the latter two being
the real POS/package-redemption flows). That JSX still needs its own tab-by-tab decomposition,
mirroring how the outer Patients block became 4 sub-PRs — scope that as Brief 11 once this state
move lands and its shape is clear, not speculatively now.

**Method:** same mechanical extraction rules as every Phase 1 brief (no behaviour change, no
renames, `npm run check` green, browser-verify the Profile Drawer still opens/loads/fetches
everything correctly — this is the highest-PII-risk move in the whole plan, so the browser check
here should be thorough: open a real patient profile, check every one of the 5 tabs loads its data,
try adding a product and selling a package).

**Exit criteria:** `admin/page.tsx` no longer declares `viewingCustomerProfile` or its supporting
effects/handlers directly; the Patients JSX block still renders and behaves identically; `npm run
check` green; browser-verified end-to-end per the note above.

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
