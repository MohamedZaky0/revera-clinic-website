# RISKS.md — Revera Clinics Risk Register

> **Last Updated:** 2026-07-25
> **Previous content was for a different project — discarded entirely**
> RISK-010 … RISK-020 were found by the 2026-07-25 finance discovery audit and are the
> remediation scope of `PROPOSALS.md` → PROPOSAL-002 Phase 0.
>
> **RISK-020 is the one to read first.** The `supabase/migrations/` folder does not describe any
> live database, and the two databases in use have diverged. Verify schema against the live DB
> before relying on any statement in `DB_SCHEMA.md`, including the ones marked "verified".

---

## RISK-001: Duplication Friction (hardcoded Revera-specific values)

**Severity:** High
**Type:** Operational / Maintainability

**Description:**
When forking this repo for client #2, Revera-specific values are scattered across many files
rather than centralized in a single config. This means every fork requires hunting through
the codebase to find and replace all client-specific values, which is error-prone and slow.

**Specific Files and Lines:**

### Clinic Name "Revera"
| File | Lines | Context |
|---|---|---|
| `src/app/layout.tsx` | 21 | Page title metadata: "Revera Clinics - Medical Center" |
| `src/app/services/page.tsx` | 14, 16 | Page title + description metadata |
| `src/app/contact/page.tsx` | 11, 13 | Page title + description metadata |
| `src/app/blog/page.tsx` | 11–12 | Page title + description metadata |
| `src/app/about/page.tsx` | 17, 19 | Page title + description metadata |
| `src/lib/translations.ts` | ~30 instances | All UI copy strings (welcome slides, about text, testimonials, FAQs) |
| `src/components/Navbar.tsx` | 71, 116, 425 | Logo alt text, WhatsApp message text |
| `src/components/AuthModal.tsx` | 121 | Logo alt text |
| `src/components/BookingModal.tsx` | 312 | Logo alt text |
| Multiple components | Various | Image `alt` attributes |

### Brand Colors (#414E36 olive, #C4AE7C gold)
| File | Type | Notes |
|---|---|---|
| `src/app/globals.css` | **Centralized** | CSS custom properties defined here — this is correct |
| `src/components/AboutSection.tsx` | Lines 146, 176, 181, 239, 250 | Inline Tailwind JIT `text-[#414E36]`, `bg-[#414E36]` — bypasses CSS vars |
| `src/components/AboutPageIntro.tsx` | Lines 257, 373, 383 | Inline `#C4AE7C` in style props |
| `src/components/BookingModal.tsx` | Lines 637, 648 | `accent-[#414E36]` Tailwind JIT |
| `src/app/admin/page.tsx` | Lines 104–107 | `bg-[#C4AE7C]/10` in overviewCards constant |
| Multiple other components | Various | See full list in hardcoding audit output |

### Logo Path `/images/main_logo.png`
Used in 15+ components as a raw string. Not centralized. Files:
`Navbar.tsx`, `AuthModal.tsx`, `BookingModal.tsx`, `AboutSection.tsx`, `AboutPageIntro.tsx`,
`AboutWhatWeDo.tsx`, `FaqSection.tsx`, `HomeServicesSection.tsx`, `OurJourneySection.tsx`,
`OurApproachSection.tsx`, `ServicesSection.tsx`, `Preloader.tsx`, `TestimonialsSection.tsx`,
`admin/page.tsx`

### Phone Numbers
| File | Notes |
|---|---|
| `src/lib/translations.ts` | 8+ instances of `(+20) 01035595691` in translation strings |
| `src/components/Navbar.tsx` | Lines 116, 154, 173, 425, 451, 463 |
| `src/components/ServicesSection.tsx` | Lines 147, 207 — in WhatsApp `wa.me` URLs |
| `src/components/HomeServicesSection.tsx` | Line 212 |
| `src/components/HeroSlider.tsx` | Line 47 |
| `src/components/SiteFooter.tsx` | Lines 532, 536 |
| `src/app/admin/page.tsx` | Lines 1214, 1221 — as fallback defaults |
| `src/app/contact/page.tsx` | Line 13 — page description metadata |

### WhatsApp Message Text (hardcoded to "New Cairo branch")
| File | Lines |
|---|---|
| `src/components/Navbar.tsx` | 116, 425 — "Hello Revera, I'd love to schedule a consultation at your New Cairo branch..." |
| `src/components/ServicesSection.tsx` | 147, 207 — "Hello Revera, I'm interested in booking ... at your New Cairo branch" |
| `src/components/HomeServicesSection.tsx` | 212 — same pattern |
| `src/components/HeroSlider.tsx` | 47 — "Hello Revera, I'd love to schedule a consultation..." |

### Service Category Names (Dermatology, Gynecology, Physical Therapy, Osteopathy)
| File | Lines | Notes |
|---|---|---|
| `src/lib/services.ts` | 116–119 | **Centralized** in `CATEGORY_LABELS` object — good |
| `src/lib/translations.ts` | 55–57, 79–83, 97–99, 258–282, 447 | Repeated in translation strings — duplicated |
| `src/app/admin/page.tsx` | 1148–1151, 6915–6916 | Hardcoded string arrays |

### localStorage Keys (branded with "revera_")
| File | Lines |
|---|---|
| `src/lib/serviceStore.ts` | 3–5 | `revera_service_toggles`, `revera_dynamic_services`, `revera_dynamic_categories` |

### Supabase Connection Config
Correctly stored in env vars (`.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**This is clean.** Forking for client #2 only requires pointing at a new Supabase project via `.env.local`. No code changes needed for connection config.

**Mitigation:** See `PROPOSALS.md` for the plan to centralize all Revera-specific values into a single `client.config.ts` file.

---

## RISK-002: Admin Auth Is Client-Side Only (Partially Resolved)

**Severity:** Medium (was Critical)
**Type:** Security
**Status:** Partially mitigated as of 2026-07-06

**What changed:**
The admin page now has a full Supabase email/password login gate. Employees are managed via `employee_accounts` + `roles` tables. Invites are sent via Supabase Auth. Superadmin access is determined by the persisted employee role. `/api/auth/me` verifies the JWT and returns role/permissions.

**Remaining gap:**
A migration at `supabase/migrations/20260722140000_enable_row_level_security.sql` enables RLS for all `public` tables, preventing direct browser/anon-key table access once applied to Supabase. Middleware validates bearer tokens against Supabase Auth before allowing employee, HR, role, and provider schedule-audit endpoints. Employee and role routes additionally enforce an `admin` or `superadmin` role server-side. API routes still use the service role key, which bypasses RLS, so remaining sensitive routes require server-side authorization before this risk can be closed.

**What would fully resolve this:**
- Add Next.js middleware that validates a Supabase session cookie for `/api/` routes
- Or add `Authorization: Bearer` token validation in individual route handlers
- Or use Supabase RLS policies on all tables (currently bypassed by service role key)

---

## RISK-003: Patient Auth Is Non-Functional

**Severity:** Medium
**Type:** Feature completeness
**Status:** Mitigated 2026-07-22

**Resolution:**
`AuthModal` now sends and verifies OTPs through Supabase Auth only. Insecure demo fallbacks, including the `123456` verification code and unauthenticated email lookup fallback, were removed. If Supabase Auth is unavailable, sign-in fails safely with a user-facing error.

---

## RISK-004: localStorage as Primary Service/Category Storage

**Severity:** Medium
**Type:** Data integrity

**Description:**
`serviceStore.ts` reads and writes services/categories from localStorage first. Supabase
is synced only on explicit save actions. If a user opens the admin panel on a different
browser or clears localStorage, they lose unsaved changes. The Supabase copy may be stale.

---

## RISK-005: Single 550KB Admin Page File

**Severity:** Low (current scale) → Medium (as features grow)
**Type:** Maintainability

**Description:**
`src/app/admin/page.tsx` is a single ~550KB client component containing 40+ admin sections,
hardcoded mock data arrays, all state variables, and all UI. Some sections are genuinely
mock UI backed by hardcoded constant arrays — not Supabase: consultation notes, treatment
plans, before/after photos, the Finances Dashboard aggregate reporting view (`MOCK_POS_ORDERS`
constant), Refunds, Shipping.

**Corrected 2026-07-21:** Prescriptions, Payroll, Inventory, and POS were previously listed
here as mock too — that was wrong as of the 2026-07-20/21 migrations. They now have real
Supabase tables (`prescriptions`, `hr_payroll`, `doctor_payroll`, `inventory_products`,
`inventory_devices`, `product_sales`) with real API routes reading/writing them — see
`DB_SCHEMA.md`. The size/maintainability concern for `admin/page.tsx` itself is unchanged.

**Naming collision to be aware of:** "Finance" here refers to the pre-existing `Finances Dashboard`
panel (`activeNav === "Finances Dashboard"`), which has no reachable sidebar trigger (the
`financesExpanded` state that would expand it is never wired to a nav item). This is unrelated
to the disabled `Finance` sidebar stub added in DEC-011 (`comingSoon: true`, superadmin-only,
no page behind it at all). Do not conflate the two when working on either.

---

## RISK-006: GPS-Based Attendance Can Be Spoofed

**Severity:** Medium
**Type:** Security / Trust

**Description:**
The distance-vs-800m check in `POST /api/hr/attendance` is already computed server-side (`getDistanceInMeters` in the route itself) — that part is not client-bypassable by tampering with browser JS. The actual weak point is the **input**: `latitude`/`longitude` are read from `navigator.geolocation` in the browser and sent as plain, unsigned values in the request body. An employee can spoof these (devtools, a location-spoofing browser extension, a rooted/jailbroken device, or calling the API directly with fabricated coordinates) and the server has no way to tell real GPS from a faked value.

**Partial mitigation implemented 2026-07-22:**
- The server validates finite latitude/longitude values, geographic bounds, and a browser-reported GPS accuracy of 100 meters or better before calculating distance or recording attendance.
- The check-in is bound to the authenticated employee account, so an employee cannot submit attendance for another employee.

**Remaining mitigation:**
- Require a tamper-resistant/signed check-in token or device attestation, since server-side distance math alone can't detect spoofed input coordinates.
- Consider IP/network-based corroboration as a secondary signal (not a full fix, but raises the spoofing bar).

---

## RISK-007: Client-Side PDF Invoice Printing Is Browser-Dependent

**Severity:** Low
**Type:** Reliability / UX

**Status:** Partially mitigated 2026-07-22

**Description:**
Invoice printing now uses the shared `src/lib/printUtils.ts` utility with a standardized A4 layout, fixed print margins, and print-color rules. Output still depends on the browser and OS because no actual PDF file is generated.

**Remaining mitigation:**
- Use a server-side PDF library (e.g., Puppeteer, react-pdf) if downloadable, identical PDF output is required.

---

## RISK-008: Hardcoded Superadmin Email

**Severity:** Medium
**Type:** Security / Fork risk

**Status:** Mitigated 2026-07-22

**Description:**
Superadmin access is now determined solely by the persisted `employee_accounts.role_name` value. Email-based bypasses were removed from admin authentication, attendance, and payroll handling.

**Remaining requirement:**
Every superadmin must have an `employee_accounts` row linked through `auth_user_id` and assigned the `superadmin` role.

---

## RISK-009: Schedule Grid Can Silently Clip Overlapping Bookings

**Severity:** Low (mitigated 2026-07-20)
**Type:** Data visibility / UX

**Description:**
The Bookings → Schedule view (`calendarView === "Schedule"`, `src/app/admin/page.tsx`, see DEC-012) fixes every cell to a hard `84px` height with `overflow-hidden` on the inner content wrapper, so that booked cells render at the same height as empty ones. If more than a couple of bookings ever land on the same doctor/slot (whether from a real double-booking, a manual admin entry, or a data edge case — overlap-prevention exists in `api/availability` and `api/reservations` but was not exhaustively re-audited here), the extra booking cards could visually clip and become invisible in this view.

**Mitigation (applied):**
- Cell now shows at most `MAX_VISIBLE_BOOKINGS = 3` cards; any beyond that render as a `+N more` pill instead of clipping silently.
- Clicking `+N more` sets `docFilter` to that cell's doctor, `dateFilter` to that day (`YYYY-MM-DD`), resets `statusFilter`/`typeFilter` to `"All"`, and switches `calendarView` to `"List"` — narrowing to exactly that doctor's bookings on that day.
- A `dateFilter` state was added to `filteredReservations` (previously List/Calendar had no date filter at all) with a date input + clear button in the existing Filter modal, and an active-filter chip row with a "Clear all" button in the List view header — so the filtered state from a `+N more` jump is visible and easy to back out of, not a hidden/stuck state.
- The List view applies the selected date filter, so the jump narrows to that doctor's bookings on the selected day.

---

## RISK-010: No Gross Price Is Ever Persisted On A Reservation

**Severity:** Critical · **Type:** Data integrity / Financial correctness
**Found:** 2026-07-25 (finance discovery audit)

`reservations` has only `amount_paid` and `amount_left` — there is no price, subtotal, total,
discount, tax, or payment-method column (`supabase/migrations/20260705141242_full_migration.sql:214-238`).
The invoice total is recomputed from the **live** services catalog on every render
(`src/app/admin/page.tsx:26997`, `src/lib/printUtils.ts:21`), and `totalCost` is never sent to the
server (`src/app/admin/page.tsx:27019-27025`).

**Consequence:** editing a service price rewrites the total of every historical invoice.
Reprinting a receipt from last month can produce a different number than the patient paid.
Any revenue report built on this is not reproducible.

**Mitigation:** PROPOSAL-002 Phase 1 — snapshot price/discount/COGS/commission onto immutable
`invoices` + `invoice_lines` at issue time.

---

## RISK-011: Branch-Specific Pricing Has Never Been Applied

**Severity:** High · **Type:** Correctness / Revenue
**Found:** 2026-07-25

Two independent bugs, both silent:
- **Server** (`src/app/api/reservations/route.ts:198-206`): queries
  `.eq('id', Number(branchId))` but `branches.id` is a UUID → `NaN`; and selects a `name`
  column that does not exist (the table has `name_en` / `name_ar`, `full_migration.sql:38-39`).
  `targetBranchName` is therefore always null.
- **Client** (`src/lib/services.ts:137-147`): treats any non-numeric string as a branch *name*.
  UUIDs are non-numeric strings, so the UUID itself is compared against `branchPricing[].name`
  and never matches.

**Consequence:** every price falls through to the `isDefault` entry or `services.price`.
Per-branch prices configured in the admin UI have never taken effect anywhere.

Related: `services.branch_pricing` is `jsonb NOT NULL DEFAULT '{}'` — an empty **object** —
while all consuming code guards with `Array.isArray()` (`services.ts:150,157,230,237`), so any
service never touched in the pricing UI silently uses `services.price`.

---

## RISK-012: Patient Debt Only Ever Grows

**Severity:** High · **Type:** Data integrity
**Found:** 2026-07-25

`src/app/api/reservations/route.ts:580`: `newOutstanding = currentOutstanding + amountLeft`.
No code path anywhere decrements `customers.outstanding` when a patient later pays their balance.

**Consequence:** all patient receivable figures are inflated and grow monotonically.
There is also no wallet transaction log — `wallet_balance` is overwritten with a computed
scalar (`:578-589`), so top-ups, spends and change deposits are indistinguishable after the write.

**Additional:** the PATCH endpoint trusts client-supplied `amountPaid`, `amountLeft`,
`walletDeposit`, `walletWithdrawal` verbatim with no idempotency (`:541-542, 575-576`).
Re-firing the same completed PATCH double-counts `spent_amount` and `outstanding`.

---

## RISK-013: Every Product Sale Deducts Stock Twice

**Severity:** High · **Type:** Data integrity
**Found:** 2026-07-25

The admin POS flow (`src/app/admin/page.tsx:3690-3773`) calls
`POST /api/inventory/products/sales`, which deducts stock internally
(`src/app/api/inventory/products/sales/route.ts:124`), **and then** calls
`POST /api/customers/products`, which deducts the same quantity again
(`src/app/api/customers/products/route.ts:189`). `handleAddProductToPatient`
(`admin/page.tsx:3608-3644`) does the same two calls in reverse order.

**Consequence:** selling 2 units removes 4 from stock. Current `stock_quantity` values are
unreliable, and so is any inventory valuation derived from them.

Related: `deductInventoryStock` matches by id **or** case-insensitive name and rewrites the
entire product catalog per sale (`inventory/products/route.ts:242-244`) — concurrent sales lose
updates, and two products sharing a name deduct the wrong item.

---

## RISK-014: `product_sales` Writes May Be Failing Silently

**Severity:** High · **Type:** Data loss · **Status:** Needs live-DB verification
**Found:** 2026-07-25

The route inserts `customer_id`, `product_sku`, `total_amount`, `sold_by` and omits `id`
(`src/app/api/inventory/products/sales/route.ts:101-115`). The migrated table has `sku`,
`customer_phone`, `total_price`, `cashier_name`, **no** `customer_id`, and `id TEXT PRIMARY KEY`
with no default (`20260720164008_setup_inventory_schema.sql:21-38`). Against the migration-defined
schema this insert fails outright and falls back to a `page_settings` JSON blob.

Worse, `getStoredSalesData` returns `{sales: dbSales}` whenever `!dbErr` (`:32-34`) — and an
**empty array is truthy** — so the fallback at `:37` is unreachable once the table exists.
POS history then reads back empty with no error.

`DB_SCHEMA.md:603` claims this route is "confirmed wired". That confidence is not justified by
the code. **Verify the live `product_sales` columns before treating it as a revenue source.**

Same class of issue: `device_maintenance_history` is a dead table — nothing in `src/` inserts
into it; the reset-pulses route writes only to `page_settings`
(`src/app/api/inventory/devices/[id]/reset-pulses/route.ts:90`), contradicting `DB_SCHEMA.md:630`.

---

## RISK-015: Doctor Cost Attribution Depends On A Name String

**Severity:** Medium-High · **Type:** Data integrity
**Found:** 2026-07-25

`reservations.doctor_name` is free text (`full_migration.sql:228`); there is no `provider_id` FK.
Doctor payroll attributes revenue by case-insensitive string equality against `providers.name`
(`src/app/api/hr/doctor-payroll/route.ts:172`). A rename, a typo, a title prefix, or two doctors
sharing a name silently detaches historical commission with no error.

Compounding issues in the same area:
- Commission exists **only** as a monthly aggregate; there is no per-reservation commission row.
- Commission is computed on **billed** price (`amount_paid + amount_left`), i.e. accrual —
  a doctor earns full commission on a booking where only a deposit was paid
  (`doctor-payroll/route.ts:182`). Must not be netted directly against a cash-basis revenue view.
- `doctor_payroll` PATCH recomputes and overwrites **already-Paid** records (`:258-315`),
  so it cannot be treated as an immutable ledger.
- A doctor who is also an employee appears in **both** `hr_payroll` and `doctor_payroll`
  for the same month (`src/app/api/employees/route.ts:174-206`) — naive summation double-counts.
- `hr_payroll.achieved_revenue` holds a **count**, not revenue, when
  `target_type_snapshot='reservations'` (`hr/payroll/route.ts:111`). Summing the column is nonsense.

---

## RISK-016: Two Conflicting Definitions Of "Revenue" Already Exist

**Severity:** Medium · **Type:** Reporting correctness
**Found:** 2026-07-25

Payroll defines revenue as `amount_paid + amount_left` — billed, not collected — with a
`|| services.price` fallback that fires whenever both are 0, silently repricing a genuinely free
session at list price (`hr/payroll/route.ts:64`, duplicated 4× in `doctor-payroll/route.ts`).
It also counts `status='approved'` (not yet delivered) as earned.

Meanwhile `customers.spent_amount` is a separate denormalized number written from two places with
different semantics: server-side on completion as `+ amountPaid + walletWithdrawal`
(`reservations/route.ts:579`), and client-side on a product sale as `+ totalAmount` via a direct
browser Supabase call (`admin/page.tsx:3745-3749`) — a lost-update race that also mixes service
revenue with retail revenue in one scalar.

**Consequence:** a finance module defining revenue as collected cash will disagree with bonus
figures already paid to staff. The definition must be chosen explicitly and documented.

---

## RISK-017: ~4,000 Lines Of Finance UI Are Unreachable Dead Code

**Severity:** Medium · **Type:** Maintainability / Stakeholder confusion
**Found:** 2026-07-25

There are only 5 `setActiveNav` call sites in `admin/page.tsx`, and nav labels come exclusively
from `SIDEBAR_ITEMS` (`:158-173`) and the Settings submenu array (`:7257-7269`). Neither contains
`Finances Dashboard`, `Expenses`, `Transactions`, `Expense Categories`, `Payroll`, `POS Orders`,
`Refunds`, `Suppliers`, `Purchases`, or `Batch Management`. All of that JSX renders for no one.

Notable traps inside it:
- The Finance→**Payroll** screen is 100% mock (`MOCK_PAYROLL`, `:394-401`) with a dead
  "Run Payroll" button (`:21625`, no `onClick`). The real payroll is under **HR** (`:21949`).
  `CLAUDE.md` rule 5 lists payroll as real — true only of the HR screen.
- Batch Management shows a "profit margin" column parsed out of hardcoded strings (`:10269-10270`).
  It looks like working COGS analytics and is entirely fake.
- "Export Gross Report" (`:12552`) and "Filter" (`:10489`) have no `onClick`.
- All mock money values are pre-formatted **strings** (`'EGP 45,200.00'`), so none of it can be
  re-pointed at numeric DB values without rewriting every render site.

**Correction to DECISIONS.md DEC-011 / RISK-005:** the old dashboard is *not* gated by
`financesExpanded` — `:3288` is the only occurrence of that state and the JSX at `:21746` checks
`activeNav` alone. The block is orphaned, not gated. And it uses `MOCK_FINANCE_TRANSACTIONS`
(`:21915`), not `MOCK_POS_ORDERS` (which belongs to the orphan POS Orders view at `:10454`).

---

## RISK-018: The Money-Mutating API Routes Are Unauthenticated

**Severity:** High · **Type:** Security
**Found:** 2026-07-25

Despite commit `f53bc4d` "security: enforce admin API authorization", only 2 of 34 API route files
import `requireStaffAccess` / `requireAdministratorAccess` (`/api/roles`, `/api/employees`).
`/api/reservations` (PATCH mutates `amount_paid`, `route.ts:322`),
`/api/inventory/products/sales` (POS writes), `/api/inventory/products` and `/api/customers`
are **not** in `PROTECTED_API_PREFIXES` (`src/middleware.ts:5`) and import no auth helper.

Any finance module reading these tables is reading data anyone on the internet can write.

**To protect a new `/api/finance/*` route, both are required:**
1. Add `'/api/finance/'` to `PROTECTED_API_PREFIXES` (`src/middleware.ts:5`) — this only proves the
   JWT is a valid Supabase user, **not** that they are staff.
2. Call `requireAdministratorAccess` (`src/lib/access.ts:58`) or a new `requireFinanceAccess`
   inside each handler to check `employee_accounts` + `roles`.

Note `hasStaffPermission` (`src/lib/access.ts:54-56`) short-circuits true for **any** `admin` role,
so it cannot currently express "admins may not see finance" without being changed.

---

## RISK-019: RLS Is Off On The Patient-Data Tables

**Severity:** Medium · **Type:** Security
**Found:** 2026-07-25 · **Verified against the live dev database**

RLS is **disabled** on `reservations`, `customers`, `services`, `providers`, `branches`,
`categories`, `page_settings`, `provider_attendance`, `rooms`, `service_rooms`, `doctor_payroll`,
`provider_schedule_audit_logs` — i.e. on the tables holding patient identities, bookings and
doctor pay. It is enabled, but with permissive "allow all" policies, on `roles`,
`employee_accounts`, `hr_*`, `employee_notes`, `prescriptions`, `inventory_*`, `product_sales`,
`device_maintenance_history`, `admin_roles`. Neither state provides real row-level protection.

`20260722140000_enable_row_level_security.sql` would fix the first group — **it has never been
applied** (RISK-020).

**Hazards for new work:**
- That migration is a one-shot `DO` block, not a trigger. Any table created after it runs has RLS
  **off** unless its own migration enables it explicitly (the 20260725120000 backfill does this by
  hand at `:77-79`). A finance migration must do the same.
- `supabase/migrations/README.md` instructs operators to re-run scripts in filename order.
  Re-running `20260715202003_add_provider_payroll.sql:26`
  (`ALTER TABLE doctor_payroll DISABLE ROW LEVEL SECURITY`) after the enable migration would
  silently turn RLS back off. Same hazard for the `DISABLE` statements throughout
  `full_migration.sql`.
- `20260705141244_setup_supabase_schema.sql` sorts **after** `..._141242_full_migration.sql` but is
  an older, narrower version of the same schema. Harmless only because everything is
  `IF NOT EXISTS`. Treat `full_migration.sql` as authoritative.

---

## RISK-020: Migrations Are Not Tracked As Applied, And Two Databases Have Diverged

**Severity:** Critical · **Type:** Operational / Data integrity
**Found:** 2026-07-25 · **Verified by querying both live databases**

There is no migration state tracking. `supabase/migrations/README.md` instructs operators to paste
SQL by hand into the Supabase SQL Editor, so whether a migration ran depends on someone remembering.
There is no Supabase CLI in this repo (no `config.toml`, no local stack), so `supabase db push`,
generated types and automated rollback are all unavailable.

**The result: a file existing in `supabase/migrations/` proves nothing about any database.**
Two Supabase projects are in use and their schemas have diverged badly.

| | dev/test DB | main DB |
|---|---|---|
| Tables | 26 | 19 |
| Schema current through | ~2026-07-20 | **~2026-07-05** |

**Absent from the dev DB** (the 2026-07-25 backfill migration was committed in `237dbec` but never
run): `medical_records`, `medical_reports`, `customer_product_balances`.

**Absent from the main DB** — 8 tables the application code actively reads and writes:
`prescriptions`, `doctor_payroll`, `employee_notes`, `provider_schedule_audit_logs`,
`inventory_products`, `product_sales`, `inventory_devices`, `device_maintenance_history`.

`reservations` on the main DB is also missing three columns the code writes to — `service_ids`,
`created_by_employee_id`, `is_manual` — so on that database multi-service bookings cannot be
persisted and employee revenue attribution is silently dropped. Its `date` column is a real `date`
type there, not the `text` the migrations declare, which is further evidence the two databases were
built by different paths.

**This class of failure stayed hidden because the code swallows it.**
`src/app/api/reservations/route.ts:274-305` retries a failed insert after deleting
`created_by_employee_id`, then retries again after also deleting `doctor_name`, then reports
success. A missing column produces a booking with silently dropped attribution and no error
anywhere.

**Undocumented tables found in the live databases, created by no migration and absent from this
file:** `admin_roles` (both databases) and `employees` (main only).

**Required before any Finance work:**
1. Establish which database is authoritative for production patient data.
2. Take a full live-schema snapshot of each and reconcile it against `supabase/migrations/`.
3. Adopt migration state tracking — at minimum a `schema_migrations` table recording applied
   filenames, ideally the Supabase CLI.
4. Remove the silent-fallback insert chain in `reservations/route.ts`; let schema errors surface.

A finance module built on the assumption that the migrations folder describes the live database
would be built on a false premise.

---

## PROPOSALS.md Reference

See `PROPOSALS.md` for:
- **PROPOSAL-001** — extract all Revera-specific values into a single `client.config.ts`,
  making fork-per-client a one-file-edit operation.
- **PROPOSAL-002** — the Finance & Management Accounting module. Its Phase 0 is the remediation
  plan for RISK-010 … RISK-015 and RISK-018.
