# Windsurf Briefs — Revera clinic platform

**One file for all Windsurf work briefs.** New briefs get appended as a new section here; do not
create separate brief files. Completed briefs stay as a short archived record at the bottom.

Standing rules live in `.windsurf/rules/*.md` (loaded automatically) and `.windsurf/MEMORIES.md`.
**Those apply to every brief in this file and are not repeated here.** Read them first.

---

# ACTIVE BRIEF

## Brief 25 — Role Management: extract, then translate, then test (3 parts, 3 commits)

**Target: `page.tsx:9640–10004`, 365 lines** (verified 2026-08-22 at `page.tsx` = 14,735 lines,
post-Brief-22 — re-measure). Extract to `src/components/admin/settings/RoleManagementView.tsx`.

Unlike Briefs 21/22 this one is **three ordered parts in three separate commits**: Part 1
extraction (zero behaviour change), Part 2 translation, Part 3 tests. Do not combine them — the
project's whole review discipline depends on a mechanical move being reviewable on its own.

### Part 1 — extraction

**Permission gate: `activeNav === "Role Management" && adminRole === "superadmin"` (line 9640), and
it is the only gate — zero `hasPermission()` calls inside the block. Preserve verbatim.**

**Known defect, preserve and log, do NOT fix:** three layers disagree about who can see this screen.
The sidebar (5887) shows it for `hasPermission("settings.roles")` **or** superadmin; the nav guards
(1900, 2575) map `"Role Management" → "settings.roles"` and let a non-superadmin through; but the
content gate (9640) demands superadmin. So an admin holding `settings.roles` sees the menu item,
clicks it, and gets a **completely blank content area** — no message, no fallback. Real UX defect,
out of scope for a mechanical move.

**Three sub-cards, all in one grid (9648–10002):**

| Card | Lines | Handlers (all defined outside the block) | API |
|---|---|---|---|
| Define System Roles | 9650–9788 | `handleCreateRole` (2362), `handleDeleteRole` (2393) | `POST /api/roles`, `DELETE /api/roles?name=` |
| Provision Employee Credentials | 9791–9944 | `handleCreateEmployee` (2413), `handleUpdateEmployeeRole` (2498), `handleDeleteEmployee` (2455), `handleResendInvitation` (2474) | `POST`/`DELETE`/`PATCH ×2 /api/employees` |
| Department Management | 9947–10001 | `handleSaveDepartments` (4260) | **`POST /api/page-settings`** (4263) |

**Moves in (Role-Management-exclusive), but note it is NOT one contiguous cluster** — same trap
Brief 22 hit: `newRoleName` (920), `newRolePermissions` (921), `roleCreateError` (925),
`roleCreateSuccess` (926) sit together at 917–928, but **`newDeptInput` is declared ~2,400 lines
away at 3366**, next to `departmentsList` (3365). Grep for both sites; don't assume contiguity.

`handleCreateEmployee`, `handleUpdateEmployeeRole` and `handleSaveDepartments` each have exactly
**one** call site and it is inside this block — Brief 21 left them behind as out of scope, and they
are now genuinely exclusive to Role Management, so they move in. **Exception:**
`handleSaveDepartments` mutates `departmentsList`, which `AdminEmployeesView` and `AdminHrView` both
consume as a prop — move the handler, keep `departmentsList`/`setDepartmentsList` lifted in
`page.tsx`, exactly the pattern Brief 21 used for `viewingEmployee`.

**Stay props (shared, do not fork):** `employeesList` (918), `rolesList` (917), `departmentsList`
(3365), `loadingRolesAndEmployees` (919), `newEmployeeName`/`Email`/`Role` (923/922/924 — shared
with the Employees component's own form), `employeeCreateError`/`Success` (927/928),
`handleDeleteEmployee`, `handleResendInvitation`, `fetchRolesAndEmployees` (2044), and `adminRole`
(read a second time *inside* the block at 9890 as a redundant re-check — **pass it down, do not
"simplify" the redundancy away**).

**Keep in `page.tsx`:** the load effect at 2021–2024, keyed on
`activeNav === "Role Management"` alongside `"Profile"`/`"Employees"` — same call Brief 22 made for
`fetchHrData`.

### Part 2 — translation

Wiring identical to Brief 23 (`lang` + `t: typeof adminTranslations["en"]["roleManagement"]`, new
namespace mirrored under `en`/`ar`). **Zero `dir=` and zero `toLocale*` in the whole block** — no
Arabic content anywhere, so exactly one new `dir` on the component root, and nothing to pin.

**`PERMISSION_STRUCTURE` (`page.tsx:391–521`, 131 lines) is the whole game here.** 12 category
groups, 57 permission keys, shape `{ category, prefix, items: [{ key, label }] }`. That is
**69 hardcoded English display strings** (12 `category` + 57 `label`) rendered at `{group.category}`
(9698) and `{item.label}` (9719) — and the grep floor of ~50 for the block **does not include any of
them**, because they live in a constant, not in JSX. Total real scope is ~119 strings, not 50.
- Every `label` is pure display — nothing compares or stores one. Safe to translate.
- Every `key` (`inventory.manage_devices`, …) is **stored in the DB and compared** by
  `hasPermission` (834), `POST /api/roles` (2375), and the `settingsSubsections` maps (1893–1905,
  2566–2577). **Never translate a key.**
- **The bug this brief exists to catch:** `page.tsx:9767` renders the canonical key string *raw* as
  the "Allowed Modules" chips —
  `{r.permissions.map((p: string) => <span key={p}>{p}</span>)}` — with no lookup into
  `PERMISSION_STRUCTURE.label` at all. It is an interpolated expression, **invisible to
  `grep '>[A-Z][a-z]'`** — the exact failure class behind Brief 18's day-names bug and all five
  Brief 20 gaps. Build a `key → label` map from `PERMISSION_STRUCTURE` and render the label, while
  keeping `p` as the React `key` and as the stored value.

**Value/label sites — one is genuinely dangerous:**
- **`page.tsx:9984` — `dept !== "Doctors" && dept !== "Receptionist"`** decides whether a
  department's delete button renders. These two hardcoded English names are the protected system
  departments (seeded at 3365 and 4252). **Translating either literal silently makes both
  deletable.** Highest-risk single line in the section after 9767.
- 9772/9781 `r.name !== 'superadmin'` → `"System Locked"`; 9890/9915/9937
  `emp.employee_id !== 'superadmin'` → `"System Owner"` — canonical values, translate the labels
  only.
- Role names (9763, 9838, 9898) and `{emp.role_name}` (9903) are user-created free text from the DB
  — leave untranslated, and note it so nobody "fixes" it later.
- 9908–9911 `"✓ Active"` / `"⏳ Invite Pending"` — pure labels, safe.
- **Two imperative-string sites a JSX grep will miss:** `alert("Department already exists!")` (9957)
  and the `confirm(...)` template at 9988.

**RTL:** `text-left` on `<th>` at 9747, 9748, 9869, 9870, 9871 → `text-start`; `ml-1` at 9992 → `ms-1`.

### Part 3 — tests (two, both permission-critical, neither is CRUD noise)

Today `/api/roles` and `/api/employees` have **auth-shape assertions only** (`auth-sweep.test.ts`
209 and 162) — zero behaviour coverage.

1. **`PATCH /api/employees` role change — privilege escalation. Write this one first.**
   `handleUpdateEmployeeRole` (2498) fires `PATCH /api/employees` (2500) from a `<select>` (9893)
   whose only guard is a **client-side** `adminRole === "superadmin"` check at 9890. Server-side
   the route requires only `requireAdministratorAccess`. Assert that a non-superadmin administrator
   cannot PATCH another account's `role_name`. **Read the PATCH handler body first** — this is
   stated as "assert this", not as a confirmed defect; the investigation did not read it. If the
   route does allow it, that is a real privilege-escalation finding: stop, log it in `RISKS.md`,
   and raise it rather than quietly fixing it inside a translation brief.
2. **`POST /api/roles` — permission-key validation.** The route validates only
   `Array.isArray(permissions)` (`src/app/api/roles/route.ts:30`); nothing checks the strings are
   real `PERMISSION_STRUCTURE` keys. A typo'd key is stored silently and then never matches in
   `hasPermission` — a role that looks configured in the UI but grants nothing. Assert unknown keys
   are rejected; if current behaviour is permissive, assert that with `it.fails` per the repo
   convention so a future tightening shows up.

Follow `tests/routes/packages-consume.test.ts` for structure (supabase fake, seeded auth, the
`it.fails` convention). **Do not** write round-trip tests for the settings blobs — see Brief 26.

---


---
---

# QUEUED BRIEFS

## Brief 26 — the 7 small Settings screens: extract behind shared hooks, then translate, then one test

**Do not write seven separate components with seven copies of the same load/save logic.** These
screens are ~1,114 lines total and they already share their persistence layer — the investigation
confirmed it rather than assumed it.

| Screen | Range | Size | Endpoint |
|---|---|---|---|
| Booking Settings | 8744–8954 | 211 | `POST /api/page-settings` key `booking` |
| Notification Settings | 9270–9468 | 199 | `POST /api/page-settings` key `notifications` |
| Queue Settings | 9470–9636 | 167 | `POST /api/page-settings` key `queue` |
| Inactivity Settings | 9113–9268 | 156 | `POST /api/page-settings` key `inactivity` |
| Branches | 8581–8736 | 156 | `POST /api/branches`, `DELETE /api/branches?id=` |
| Deposit Settings | 8965–9111 | 147 | `POST /api/page-settings` key `deposit` |
| Service Hours | 8502–8579 | 78 | `POST /api/branches` (writes `service_hours`) |

Five share `POST /api/page-settings` with a partial payload keyed on one top-level property, and all
five hydrate from the **same** loader `fetchPageSettings()` (4089–4258). The other two share
`POST /api/branches` and the same `branches`/`setBranches` state — **Service Hours is really a
sub-view of Branches**, selecting one via `selectedBranchForHoursId` (3225, dropdown 8512–8520).

**Structure:** `src/components/admin/settings/` with a `usePageSettings()` hook (one loader, one
`savePartial(key, payload)` writer) behind the five, and Branches + Service Hours sharing branch
state. Extract first (Part 1), translate second (Part 2), one test (Part 3).

**State is in FOUR clusters, not one** — assuming contiguity will lose fields:
`811–817` (inactivity + `bookingStaleSessionHours`, which sits ~2,600 lines from the rest of Booking
Settings' own state), `3099–3100` (`pagesSettingsTab`, `termsText`), `3217–3226` + `3372–3380`
(branches + service hours), `3425–3463` (the booking/deposit/notification/queue block).

**Cross-component coupling — `handleSaveBookingSettings` (4445) must NOT move into a Booking
Settings component.** The already-extracted `TermsManagerView` receives it as a prop at 8959–8961,
and both write the same `booking` key. Keep it lifted.

**Also coupled:** Role Management's `handleSaveDepartments` writes the same `/api/page-settings`
blob (Brief 25). Whichever of the two lands second must not fork the writer.

### Defects found — preserve verbatim in Part 1, log them, fix none of them here

1. **Notification Settings and Queue Settings never hydrate.** `fetchPageSettings` has no
   `data.notifications` or `data.queue` branch; every `setNotif*`/`setQueue*` setter is called only
   from its own `onChange`. Both screens are **write-only** — reload the panel and saved values
   silently revert to the `useState` defaults. Same class as RISK-058.
2. **`POST /api/page-settings` merges shallowly** (`{ ...existing?.value, ...body }`), so a partial
   write that omits a sibling field inside a key **destroys it**. Live instance: `savePageSettings()`
   (Pages Settings, Brief 27) sends a `booking` block at 4632–4641 that omits `staleSessionHours`,
   so saving any CMS section wipes it. `handleSaveBookingSettings` includes it, so Booking Settings
   is the safe writer and Pages Settings is the destructive one.
3. **Booking, Notification and Queue saves are fire-and-forget** — they `await fetch(...)` and never
   check `res.ok`, never alert, never `clearFetchCache()`, never re-fetch (4448, 4475, 4492). A
   failed save is completely silent. Deposit (4386) and Inactivity (4420) do check.
4. **Hardcoded client values, CLAUDE.md rule-2 / RISK-001 shape**, densest in Deposit Settings:
   `"Revera Clinic"`, `"revera@instapay"`, `"https://www.instapay.eg"`, `"Revera Clinics Cash"`,
   `"01012345678"` appear as `useState` defaults (3436–3442) **and again** as fallbacks in
   `fetchPageSettings` (4216–4233); Notification adds `"Revera Clinics"` / `"ريفيرا كلينيك"`
   (3451–3452) and `"admin@reveraclinics.com"` (3454). Name them in the PR; fix under PROPOSAL-001.

### Part 2 — translation notes per screen

- **Branches and Notification Settings edit bilingual *content*** — Branches has a field descriptor
  array (8691–8698) with `dir: "rtl"` on the two Arabic rows applied via `dir={dir}` at 8705;
  Notification has a hardcoded `dir="rtl"` at 9406 on the Arabic SMS-template textarea. **These are
  content-direction hints, not the language toggle — leave every one untouched**, same call Brief 19
  made for `AdminServicesView`.
- **Service Hours: `{sh.day}` at 8534 renders the raw English weekday** — interpolated, invisible to
  string greps, identical to the Brief 18 day-names bug. **But before adding a lookup:** the
  `serviceHours` type already carries a `dayAr` field (3372) that every seed row populates
  (`"الأحد"` …, 3373–3379 and 3969–3975) and **nothing ever renders**. Wire the existing field
  rather than inventing a parallel lookup.
- **Branches value/label:** `<option value="active">Active</option>` / `"inactive"` (8720–8721) with
  `br.status === "active"` comparisons at 8613, 8620 driving badge class *and* label. Canonical
  lowercase values; label-only translation.
- **A display decision to make explicitly, not by accident:** the branch card renders `{br.name_en}`
  as heading (8611) and `{br.name_ar}` as subtitle (8615) **regardless of `lang`**. Decide whether
  Arabic mode swaps them or keeps both, and say which in the PR. Same question for the
  `{b.name_en} ({b.name_ar})` cramped-bilingual `<option>` at 8518.
- Booking/Queue/Notification `<select>`s are all **numeric** values with English suffix labels
  (8783, 8808, 8833, 8884; 9600–9604; 9434–9438) — safe, translate labels only.
- **Inactivity Settings is the cleanest of the seven** (no options, no placeholders, no `dir`, no
  `toLocale*`, no value/label sites) — but its two values feed the **global** presence-monitoring
  effect at 2232–2248 that runs for every logged-in staff role, so its state must stay lifted in
  `page.tsx`; pass values + setters down.
- **`toLocale*`: zero across all seven.** Nothing to pin.

### Part 3 — exactly one test, and it is not a round-trip

**Write the `POST /api/page-settings` shallow-merge test.** Seed a row with
`booking: { minAdvance: 2, staleSessionHours: 6, termsText: "X" }`, POST the exact payload
`savePageSettings()` builds at 4585–4643 (which omits `staleSessionHours`), assert the stored value.
It will show the field destroyed — a real, currently-reproducible data-loss bug, and the single
highest-value test in this whole survey. Land it as `it.fails` per repo convention (or fix + assert,
but the test is required either way).

**Do NOT write** round-trip tests for the individual Deposit/Inactivity/Booking/Notification/Queue
payloads. They assert that a config blob echoes itself. The merge semantics are the thing worth
testing; the individual payloads are not. If you want the never-hydrate bug covered, add a one-line
assertion inside the same test rather than five new files.

---

## Brief 27 — Pages Settings: extract in 3 ordered sub-PRs (translation deferred)

**`page.tsx:6640–8426`, 1,787 lines — the largest remaining block by 5×. Do not attempt this as one
brief.** Split by tab, smallest first, the same shape that worked for Briefs 5/10/11:

| Sub-PR | Tab | Range | Size | Sub-sections |
|---|---|---|---|---|
| 27.1 | Services | 7989–8424 | 436 | How It Works (7994), Why Choose Us (8108) |
| 27.2 | Home | 6666–7148 | 483 | Hero Slider (6672), Before/After Results (6962) |
| 27.3 | About Us | 7150–7987 | 838 | About Photos (7154), What We Do (7344), FAQ (7591) |

Plus a shared `usePageSettings` hook holding `savePageSettings` (4532–4664), `handleAutoTranslate`
(4506–4531) and the ~50 content state vars (roughly 3380–3424 plus scattered
`wcu*`/`faq*`/`howItWorks*` declarations — **enumerate these before starting; the investigation
deliberately did not, and the enumeration is mechanical but load-bearing**).

**This is a bilingual content editor, not a UI needing its own chrome translated — and the two must
not be conflated.** It already has its own content-language tab, `pageSettingsLangTab`
(declared 3380, typed `"en" | "ar"`, toggle at 6693–6710, driving
`const slidesList = pageSettingsLangTab === "en" ? homeHeroSlides : homeHeroSlidesAr` at 6667).
**That is orthogonal to the admin `lang` state and must never be merged with it.** Likewise:
- **21 hardcoded `dir=` attributes** on Arabic content inputs (7535, 7537, 7765, 7766, 7786, 7787,
  7905, 7921, 7945, 8050, 8051, 8071, 8072, 8324, 8325, 8345, 8346, 8366, 8367, 8388, 8389) — content
  hints, leave untouched.
- **32 lines containing Arabic literals** are **default content values, not UI copy** — do not move
  them into `translations.ts`.
- `_ar` field pairs throughout (`homeHeroSlidesAr`, `whatWeDoListAr`, `faqsAr`, `wcuQuoteAr`, …).

**Real auto-translate feature, not dead code:** `POST /api/translate` via `handleAutoTranslate`, 16
call sites plus a 5-use per-slide wrapper in the Hero editor. Preserve it exactly.

**Payload concern worth flagging (not fixing):** there is no image-upload endpoint — every image is
`compressImage()`d and stored **inline as base64 in the settings JSON blob** (6784, 7036, 7098,
7190, 7247, 7304, 7380, 7437, …), and every one of the 8 in-block `savePageSettings()` calls
re-POSTs the entire blob including every embedded image.

**Also carries defect #2 from Brief 26:** `savePageSettings()`'s `booking` block (4632–4641) omits
`staleSessionHours` and the shallow merge therefore destroys it on every CMS save.

**Chrome string count ~163** (91 JSX text nodes + 38 placeholders + 4 `title=` + headings + ~5
`alert()` messages at 4653/4656/4660) — a floor, since the Translate buttons build labels by
interpolation (`` `Translate to ${...} ➜` `` at 6821, 6842, 6863, 6884). **`toLocale*`: zero. No
`<option>` elements at all.**

**Pre-existing encoding corruption, found not caused:** lines 6821, 6842, 6863, 6884, 6916 contain
`âž"` — a mojibake'd `➜`. Confirm with `git log -S` before touching; **do not "fix" it inside an
extraction PR.**

**Translation is deliberately deferred** to a later brief — extract all three sub-PRs first. The
chrome/content distinction above is subtle enough that mixing it with a mechanical move is how this
one goes wrong.

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

### Brief 23 — Phase 2: translate `AdminEmployeesView.tsx` to Arabic (completed 2026-08-22)

First submission was reviewed and rejected: the live "View Employee Details" drawer's Basic Info
and Work tabs were never wired to translation keys that already existed and were already correctly
used in the print function in the same file — print got it right, the live view didn't. Also still
present: the exact `emp.shift` raw-value bug the brief itself had already called out (3 sites).
Findings written into this file's `## Brief 23` entry with exact line numbers rather than a
re-do request.

Fixed in commit `3efe21f`, alongside Brief 24's fix. Re-verified independently: `tsc`/`eslint`/
`vitest` clean (0 errors, warning count unchanged — no new ones), en/ar key parity confirmed by
evaluating `adminTranslations` at runtime (a grep-based check gives false positives on any key
whose value is a function), and every previously-raw site re-traced by hand. The 3 `emp.shift`
sites now route through a new `t.profile.shiftLabel()` function that translates recognized values
and passes anything else through unchanged — comparison sites (`=== "Night"`, `.includes(...)`)
still compare the raw canonical value throughout. Browser-verified live in both languages: the
Employees list table's shift badge, and the profile drawer's Basic Info and Work tabs, including a
row with a genuinely custom (non-Day/Night) shift value correctly falling through the label
function unchanged in both languages — confirms the fallback design, not a gap. Manual test
checklist: `ai_docs/manual_tests/BRIEF_23_EMPLOYEES_TRANSLATION_MANUAL_TESTS.md`.

### Brief 24 — Phase 2: translate `AdminHrView.tsx` to Arabic (completed 2026-08-22)

Landed cleanly apart from one contained gap: the Payroll tab's department filter dropdown had 5
hardcoded English `<option>` labels. Fixed in the same commit as Brief 23 (`3efe21f`) — `value=`
stays canonical (`Doctors`/`Nursing`/`Admin`/`Reception`/`Lab`, still compared against
`pay.department` elsewhere), only the visible text now routes through `t.payroll.deptDoctors`
etc. `dir` wiring was correct from the first submission, including on the physically-detached Edit
Target modal, which isn't DOM-nested under the component root and needed its own attribute — got
that right without it being called out. `tsc`/`eslint`/`vitest` clean, en/ar key parity confirmed
at runtime. Browser-verified live: the department filter shows Arabic labels while its underlying
`value`s are unchanged. Manual test checklist:
`ai_docs/manual_tests/BRIEF_24_HR_TRANSLATION_MANUAL_TESTS.md`.

