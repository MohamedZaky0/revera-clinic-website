# Windsurf Briefs — Revera clinic platform

**One file for all Windsurf work briefs.** New briefs get appended as a new section here; do not
create separate brief files. Completed briefs stay as a short archived record at the bottom.

Standing rules live in `.windsurf/rules/*.md` (loaded automatically) and `.windsurf/MEMORIES.md`.
**Those apply to every brief in this file and are not repeated here.** Read them first.

---

# ACTIVE BRIEF

## Brief 6 — Phase 2 setup + pattern-proving translation: MedicalReportModal (written 2026-08-17)

**Read first:** `ai_docs/ADMIN_REFACTOR_AND_I18N_PLAN.md` Phase 2 (2.1–2.4), `DECISIONS.md` →
**DEC-043** (admin-local language state, Western digits, per-component rollout). Migration
`20260817020000_create_reservation_products.sql` (DEC-042) is now applied and live-verified —
unrelated to this brief, mentioned only so it's not re-flagged as outstanding.

**Why this is Phase 2's own "prove the pattern first" step:** same reasoning DEC-043 already
applied to extraction order — set up the shared language mechanism once and prove it end-to-end on
the smallest completed component (`MedicalReportModal.tsx`, ~152 lines) before rolling it out to
the other 3 Patients components from Brief 5.

**Correction to the plan's own assumption, found while scoping this brief:** the plan cites
`DoctorAccountView`'s `lang` state as the pattern to mirror. Checked its actual implementation —
`const [lang, setLang] = useState<"en"|"ar">("en")` (`DoctorAccountView.tsx:36`) has **no
`localStorage` persistence at all** — it resets to `"en"` on every mount. DEC-043/the plan's own
2.2 explicitly calls for persistence ("Persist to `localStorage` under `CLIENT.storagePrefix`"), so
this brief adds that as a deliberate improvement over the Doctor Portal, not a straight copy of it.

**Also found while scoping:** `admin/page.tsx` already has a **dead** `lang` state —
`const [lang, setLang] = useState<"EN" | "AR">("EN")` at line 1499. Grepped every reference: it is
never read and `setLang` is never called anywhere else in the file. Same shape of gap as
`attachedProducts` (DEC-042) — a piece of scaffolding declared and abandoned. **Replace it**, don't
add a second one — with lowercase `"en"`/`"ar"` values (matching Doctor Portal and the public
`LanguageContext`'s convention, not this dead stub's uppercase one).

### Part A — Shared setup (once, not per-component)

1. **Language state** (`admin/page.tsx`): replace the dead `lang` state at line 1499 with:
   ```ts
   const [lang, setLang] = useState<"en" | "ar">(() => {
     if (typeof window === "undefined") return "en";
     const stored = localStorage.getItem(`${CLIENT.storagePrefix}_admin_lang`);
     return stored === "ar" ? "ar" : "en";
   });
   useEffect(() => {
     localStorage.setItem(`${CLIENT.storagePrefix}_admin_lang`, lang);
   }, [lang]);
   ```
   `CLIENT.storagePrefix` is `"revera"` (`src/config/client.ts:25`) — **not yet imported in
   `admin/page.tsx`** (checked: no `@/config/client` import exists there today), so add
   `import { CLIENT } from "@/config/client";` alongside the other top-of-file imports.
2. **Toggle UI**: add a language toggle near the sidebar header (`admin/page.tsx` ~line 26468,
   the `REVERA CLINICS` header), visually matching `DoctorSidebar.tsx`'s existing toggle exactly
   (`src/components/admin/doctor/DoctorSidebar.tsx:70–93` — same two-button pill, same active/
   inactive classes) rather than inventing a new visual style for the same control.
3. **New file** `src/components/admin/translations.ts`:
   ```ts
   export const adminTranslations = {
     en: {
       patients: {
         medicalReportModal: { /* keys below */ },
       },
     },
     ar: {
       patients: {
         medicalReportModal: { /* keys below */ },
       },
     },
   };
   ```
   Namespaced per DEC-043/plan 2.1 (`patients.*`, more top-level namespaces added as more sections
   get translated later — don't pre-create empty namespaces for unstarted sections).

### Part B — Translate `MedicalReportModal.tsx` (the actual Phase 2 work for this brief)

Every hardcoded string in the file, enumerated by reading it directly (not guessed) — 15 total:

| Key | Current (EN) string |
|---|---|
| `title` | "Upload Medical Report & Document" |
| `subtitle` | "Attach lab results, scan reports, or external clinical documents" |
| `reportTitleLabel` | "Report Title" |
| `reportTitlePlaceholder` | "e.g. Complete Blood Count & Hormonal Panel" |
| `descriptionLabel` | "Description / Notes" |
| `descriptionPlaceholder` | "Key clinical findings or doctor observations..." |
| `fileUrlLabel` | "Document Link / File URL" |
| `staffNameLabel` | "Recording Staff / Doctor Name" |
| `staffNamePlaceholder` | "e.g. Dr. Sarah Al-Sayed" |
| `cancelBtn` | "Cancel" |
| `saveBtn` | "Save Medical Report" |
| `savingBtn` | "Uploading..." |
| `missingTitleAlert` | "Please enter a report title." |
| `saveFailedAlert` | "Failed to save report." |
| `saveErrorAlert` | "An error occurred while saving report." (fallback when `err.message` is empty) |

Not translated, per DEC-043 2.4: the `https://...` URL placeholder (not user-facing copy, an input
format hint) and anything that's actual patient/report data (none in this modal — it's all labels).

Steps:
1. Add `lang: "en" | "ar"` and `t: typeof adminTranslations["en"]["patients"]["medicalReportModal"]`
   props to `MedicalReportModalProps`.
2. Replace all 15 strings above with `t.<key>` lookups.
3. Add `dir={lang === "ar" ? "rtl" : "ltr"}` to the modal's root `<div>` (currently
   `className="fixed inset-0 z-[9999] ..."`, line 69).
4. RTL audit (per plan 2.3): grepped the file for `ml-`/`mr-`/`text-left`/`text-right`/
   `rounded-l-`/`rounded-r-`/`translate-x` — **none present**. Layout is `flex`-based throughout, so
   `dir` alone should flip it correctly, but confirm visually in the browser rather than trusting
   the grep alone — a truly empty result is exactly the kind of thing worth double-checking by eye.
5. Update the render call at `admin/page.tsx:12205` to pass `lang={lang}`
   `t={adminTranslations[lang].patients.medicalReportModal}`.

### Exit criteria

- Toggle switches the modal's language live, no page reload needed.
- Toggle choice survives a hard page reload (localStorage persistence — the actual improvement over
  Doctor Portal's version).
- RTL layout confirmed by eye in the browser, not just by the (empty) grep.
- `grep -n '>[A-Z]' src/components/admin/patients/MedicalReportModal.tsx` (per the plan's own
  per-component exit criteria) turns up no leftover hardcoded English JSX text.
- `npm run check` green (`tsc` + `eslint` + `vitest`, 107 tests still passing).
- Browser-verify both languages end-to-end: open the modal, toggle to Arabic, fill and submit,
  confirm `POST /api/medical-records` still succeeds (this PR must not touch that call).

### What happens after this brief

Once reviewed, repeat Part B's method (state/props/dir/audit, no new Part A setup needed — that's
shared now) for the other 3 Brief 5 components: `MedicalFormModal.tsx`, `CustomerFormModal.tsx`,
`PatientsDirectoryView.tsx` — each its own brief and commit, largest/most string-heavy last
(`PatientsDirectoryView` and `CustomerFormModal` both look substantially bigger than this one from
their line counts). Sub-PR 5 (Customer Profile Drawer investigation) remains separate, unblocked
either way.

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
