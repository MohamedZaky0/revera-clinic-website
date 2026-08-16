# RISKS.md — Revera Clinics Risk Register

> **Last Updated:** 2026-08-17 (RISK-057)
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

## RISK-004: localStorage as Primary Service/Category Storage (RESOLVED via RISK-025)

**Severity:** Medium → **High 2026-07-27** → **Resolved 2026-07-27**
**Type:** Data integrity

**Description:**
`serviceStore.ts` reads and writes services/categories from localStorage first. Supabase
is synced only on explicit save actions. If a user opens the admin panel on a different
browser or clears localStorage, they lose unsaved changes. The Supabase copy may be stale.

**Correction 2026-07-27 — "synced only on explicit save actions" was wrong; there was no sync at
all.** Measured while scoping Phase 3B task 3B.2: every save path in the admin Services UI called
`saveDynamicServices()`, which wrote **only** to `localStorage`. Zero calls to
`POST /api/services` existed anywhere in `admin/page.tsx`.

**Resolution:** See **RISK-025**. Services are now database-primary: admin loads from and saves to
`/api/services`, public components fetch services from the same API, and `localStorage` is used only
for service toggles (visible/active UI state) and dynamic categories.

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
**Found:** 2026-07-25 · **RESOLVED 2026-07-25**

**Fix:** a shared `resolveBranchName()` in `src/lib/services.ts` compares ids as strings and refuses
to treat a UUID as a name; the server query uses `.eq('id', branchId)` with `select('name_en,
name_ar')` and no longer discards its error. Regression check: `npx tsx scratch/pricecheck.ts`.

**Historical impact: none.** Every price charged before this fix used the `isDefault` entry or
`services.price` rather than a branch price — but all of that data is mock (DEC-026), and no
backfill is being built, so there is nothing to restate.

Original diagnosis below.

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
**Found:** 2026-07-25 · **RESOLVED (server side) 2026-07-25**

**Fix:** the arithmetic moved to `src/lib/billing.ts` → `computeSettledBalances()`, a pure tested
function, and now applies **deltas** against the pre-update reservation row rather than absolutes.
Debt is booked on the completion transition, reduced by later payments, unaffected by a replayed
PATCH, and clamped at zero with a warning. Regression check: `npx tsx scratch/billingcheck.ts`
(15 assertions).

> **Still open — a feature, not a bug.** `outstanding` *can* now decrease, but **no admin UI lets a
> patient settle a balance.** Only "mark deposit paid" and checkout send money fields. In practice
> debt still accumulates; the server just no longer guarantees it. A settle-debt flow needs
> building — Phase 1's payments ledger is the natural home.

Original diagnosis below.

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
**Found:** 2026-07-25 · **RESOLVED 2026-07-25**

**Fix:** `POST /api/inventory/products/sales` is now the single owner of stock movement;
`POST /api/customers/products` records patient ownership only and no longer deducts. Also removed a
dead `PUT /api/inventory/products` call in the sell flow that always 400'd and would have been a
third deduction path had it worked.

**Not fixed by this:** existing `stock_quantity` values are corrupted by past double-deductions —
which does not matter, since all current data is mock (DEC-026). A real clinic's stock arrives via
the opening-balance import (DEC-024). The concurrency issue below is still open.

Original diagnosis below.

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

## RISK-014: Every POS Sale Fails To Write, And Sales History Reads Back Empty

**Severity:** High · **Type:** Data loss
**Found:** 2026-07-25 · **RESOLVED 2026-07-25** — route fixed in `23e0e5e`, migration
`20260725160000` applied to dev the same day. Sales now persist to `product_sales`.
**Outstanding:** sales recorded before the fix are still in `page_settings`
(key `product_sales_history`) and have not been migrated in — see `FINANCE_TRACKER.md`.

The live `product_sales` table matches its migration exactly. **The route is what is wrong** —
`src/app/api/inventory/products/sales/route.ts:101-115` inserts column names that do not exist:

| Route sends | Live column | |
|---|---|---|
| `product_sku` | `sku` | mismatch |
| `customer_mobile` | `customer_phone` | mismatch |
| `total_amount` | `total_price` | mismatch |
| `sold_by` | `cashier_name` | mismatch |
| `customer_id` | *no such column* | missing |
| *(never sent)* | `id` — `text` PK, no default | omitted |
| *(never sent)* | `branch_name` | omitted, so no per-branch product P&L |

Live columns, verified: `id, product_id, product_name, sku, quantity, unit_price, total_price,
customer_name, customer_phone, customer_email, cashier_name, branch_name, payment_method, notes,
sale_date, created_at`.

**Consequence:** every POS sale insert fails and falls through to the `page_settings` JSON blob
(key `product_sales_history`). Then `getStoredSalesData` returns `{sales: dbSales}` whenever
`!dbErr` (`:32-34`) — and an **empty array is truthy** — so the fallback read at `:37` is
unreachable now that the table exists. Sales are written to one place and read from another,
so POS history displays empty.

**Fix:** correct the insert payload to the six mismatched/missing names above, generate an `id`,
set `branch_name`, and change the read guard to treat an empty result as "fall through" rather than
"authoritative" — matching the pattern already applied to `customer_product_balances` in `8f280cc`.

Note `inventory_products` is fine: its live columns match the migration
(`id, name, sku, category, price, cost_price, stock_quantity, min_stock_alert, unit, status,
branch_name, created_at, updated_at`). The TypeScript interface at `route.ts:6-22` uses different
names (`purchase_price`, `selling_price`, `min_reorder_quantity`, `branch_id`, `arabic_name`) but
`mapProductToDbRow` translates them — except that it never writes `branch_name` and
`mapDbRowToProduct` hardcodes `branch_id: null`, so branch attribution is lost for products too.

Same class of issue: `device_maintenance_history` is a dead table — nothing in `src/` inserts
into it; the reset-pulses route writes only to `page_settings`
(`src/app/api/inventory/devices/[id]/reset-pulses/route.ts:90`), contradicting `DB_SCHEMA.md:630`.

---

## RISK-015: Doctor Cost Attribution Depends On A Name String

**Severity:** Medium-High → Low (name-matching part) · **Type:** Data integrity
**Found:** 2026-07-25 · **Name-string attribution and monthly-aggregate-only commission RESOLVED
2026-07-26 — see `FINANCE_TRACKER.md` task 2.14. Three compounding issues below remain open.**

**Fix:** `src/app/api/hr/doctor-payroll/route.ts`'s three match sites (`GET`, `POST`, `PATCH`) now
filter reservations by `r.provider_id === prov.id` instead of a case-insensitive
`doctor_name`/`providers.name` string comparison — a rename can no longer silently detach a
doctor's historical commission. Commission is also no longer re-derived live from
`amount_paid + amount_left`; it sums the real per-reservation `invoice_lines.commission_snapshot`
values Phase 2's checkout costing (tasks 2.11/2.15) now writes at completion time, computed via
`computeCommission()` (task 2.9) against each provider's configured `commission_type` /
`commission_base` (task 2.8) — commission is now an inspectable per-session number, not only a
monthly total. A reservation whose `provider_id` is `NULL` (task 0.7: the name matched zero or
more than one provider) is simply excluded from payroll, which is more honest than a fuzzy
string fallback silently re-attaching it to the wrong doctor.

**Not fixed by this — the three compounding issues below are still open:**
- Commission is still computed on **billed**, accrual-basis price via `invoice_lines.line_total`
  (now snapshotted rather than re-derived, but still accrual, not cash) — must not be netted
  directly against a cash-basis revenue view (RISK-016).
- `doctor_payroll` PATCH still recomputes and overwrites **already-Paid** records (`:258-315`),
  so it still cannot be treated as an immutable ledger.
- A doctor who is also an employee still appears in **both** `hr_payroll` and `doctor_payroll`
  for the same month (`src/app/api/employees/route.ts:174-206`) — naive summation still
  double-counts.
- `hr_payroll.achieved_revenue` still holds a **count**, not revenue, when
  `target_type_snapshot='reservations'` (`hr/payroll/route.ts:111`) — summing it is still nonsense.

Original diagnosis below, kept for reference.

`reservations.doctor_name` is free text (`full_migration.sql:228`); there was no `provider_id` FK
at the time this risk was found. Doctor payroll attributed revenue by case-insensitive string
equality against `providers.name` (`src/app/api/hr/doctor-payroll/route.ts:172`). A rename, a
typo, a title prefix, or two doctors sharing a name silently detached historical commission with
no error.

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

**Severity:** High → Low · **Type:** Security
**Found:** 2026-07-25 · **RESOLVED 2026-07-26** — see `FINANCE_TRACKER.md` 0.10 for the full
per-route breakdown and every verification step.

**Fixed:**
- `DELETE /api/reservations` → admin-only.
- `PATCH /api/reservations` → staff-only for every approval, rejection, checkout, lifecycle, note
  or booking-edit action; the only unauthenticated exception is the strictly shaped public deposit
  self-report for a `pending_deposit` booking (a body containing exactly
  `{status, amountPaid, amountLeft, notes}`), which is the one legitimate anonymous write this
  route must keep accepting (RISK-003 — patients have no separate login).
- `POST /api/inventory/products/sales`, all of `/api/inventory/products`,
  `/api/inventory/devices` (+ `reset-pulses`), and `/api/customers/products` → staff-only.
  Verified no patient-facing caller exists for any of these.
- **`/api/customers` GET/POST → authenticated with per-identity scoping, not a blanket staff
  gate.** Patients call this route directly for OTP login and profile self-service, so it needed
  scoping rather than a lockout. A patient caller may only read or write **their own** record —
  enforced by `isOwnIdentity()` in `src/lib/customerIdentity.ts`, using the new
  `customers.auth_user_id` link where present and falling back to normalized phone / email for
  rows that predate it. Without this, a caller who was merely "any authenticated user" could read
  or overwrite another patient's profile by guessing a mobile number — an IDOR that a naive fix
  would have introduced. Financial fields (`spent_amount`, `outstanding`, `wallet_balance`) are
  never patient-writable regardless of request body content. `DELETE /api/customers` stays
  admin-only.
- **A real near-miss during this fix, worth recording:** an earlier attempt in the same session
  gated `/api/customers` GET/POST behind a blanket `requireStaffAccess` with no caller updates —
  which would have 403'd every patient login and registration had it shipped. Caught by checking
  actual caller code before trusting the change, not by assumption.

Regression checks: `npx tsx scratch/identitycheck.ts` (10 cases incl. the IDOR case),
plus `scratch/pricecheck.ts` and `scratch/billingcheck.ts` still passing.

Original diagnosis below.

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

## RISK-019: RLS Coverage

**Severity:** Low (was Medium) · **Type:** Security
**Found:** 2026-07-25 · **Largely resolved 2026-07-25**

Until 2026-07-25, RLS was **disabled** on `reservations`, `customers`, `services`, `providers`,
`branches`, `categories`, `page_settings`, `provider_attendance`, `rooms`, `service_rooms`,
`doctor_payroll` and `provider_schedule_audit_logs` — the tables holding patient identities,
bookings and doctor pay — because `20260722140000_enable_row_level_security.sql` had never been run.

**That migration was applied to dev on 2026-07-25.** RLS is now on for every table in `public`.

A prerequisite had to be fixed first: `src/app/admin/page.tsx` wrote to `customers` directly from
the browser with the anon key, which enabling RLS would have turned into a silent no-op that still
reported success. That write moved server-side into `POST /api/inventory/products/sales` in
`8108b82`, and no client component reads or writes a Supabase table any more.

**Residual risk:** the subset carrying permissive "allow all" policies (`roles`,
`employee_accounts`, `hr_*`, `employee_notes`, `prescriptions`, `inventory_*`, `product_sales`,
`device_maintenance_history`, `admin_roles`) is functionally open — salary and inventory data is
readable with the anon key. Those policies should be tightened or dropped, since every access path
now goes through the service role anyway.

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

**Severity:** High · **Type:** Operational / Delivery model
**Found:** 2026-07-25 · **Verified by querying both live databases**

**Production is not live yet** (confirmed 2026-07-25) — `main` serves no real patients, so nothing
is currently broken for users. The severity is not about today; it is about two moments that are
already scheduled:

1. **At merge time.** Bringing `main` up to date means hand-applying ~15 migrations in order, with
   no record of what already ran, against a database whose actual state nobody has snapshotted.
   The silent-fallback insert chain below guarantees that partial failure looks like success.
2. **At every new clinic.** DEC-001 commits to fork-per-client with a **separate Supabase project
   per clinic**. With hand-pasted, untracked migrations, provisioning each new clinic's schema is a
   manual 30-file operation that must go right every time. This is a scaling defect built into the
   delivery model, not a one-off.

Fixing this is far cheaper now, before production exists, than at any later point.

The Supabase CLI is linked to dev, whose migration history now contains only the active
`20260726000000` baseline. A direct dev dump generated that baseline, and `db pull` replayed it in a
shadow database with no schema diff. New dev-based provisioning is now reproducible; the remaining
operational risk is reviewing main directly and cutting it over to the same baseline.

**The result: a file existing in `supabase/migrations/` proves nothing about any database.**
Two Supabase projects are in use and their schemas have diverged badly.

| | dev/test DB | main DB |
|---|---|---|
| Tables | 26 | 19 |
| Schema current through | ~2026-07-20 | **~2026-07-05** |

**Verified present in the dev DB on 2026-07-26:** `medical_records`, `medical_reports`,
`customer_product_balances`, `product_sales.customer_id`, `reservations.provider_id`, and
`services.duration_minutes`. This verification came from a direct linked dev schema dump.

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
1. Take a full live-schema snapshot of the dev database and reconcile it against
   `supabase/migrations/`.
2. **Consolidate the 30 migration files into one clean baseline schema.** With no production data
   to preserve, this is a one-time cheap fix that removes the conflicting duplicate table
   definitions (`141242` vs `141244`), the `DISABLE ROW LEVEL SECURITY` re-run hazard, and the
   ambiguity about what ran. It also makes provisioning a new clinic a single script.
3. Adopt migration state tracking — ideally the Supabase CLI (`supabase db push`, which maintains
   `supabase_migrations.schema_migrations`, and gives generated TypeScript types and a local stack).
   At minimum a hand-rolled `schema_migrations` table recording applied filenames.
4. Remove the silent-fallback insert chain in `reservations/route.ts:274-305`; let schema errors
   surface instead of degrading data quietly.

A finance module built on the assumption that the migrations folder describes the live database
would be built on a false premise.

---

## RISK-021: `/api/employees` Callers Were Missing Bearer Tokens, And `/api/employees/notes` Had No Server-Side Role Check At All

**Severity:** Medium → Resolved · **Type:** Security / Broken feature
**Found:** 2026-07-26 (user-reported: "Provision Employee Credentials" 401'd with
"Unauthorized: Authentication required for administrative endpoint") · **RESOLVED 2026-07-26**

**Two distinct bugs, found while fixing the reported one:**

1. **Nine `fetch('/api/employees'...)`/`fetch('/api/employees/notes'...)` call sites in
   `admin/page.tsx`** (create employee, delete employee, resend invitation, change role, edit own
   profile, the second create-employee form, employee note create/delete/list) sent no
   `Authorization` header at all, while `src/middleware.ts` requires one for the `/api/employees`
   prefix (added independently of this session's finance work — see DEC-010/RISK-002). Every one
   of those actions 401'd with the exact message reported. Two other call sites in the same file
   (`:19404`, `:27466` before this fix) already sent the header correctly, which is what made this
   an inconsistency rather than a wholesale missing feature — the working pattern existed, it just
   wasn't applied everywhere. Fixed by adding `Authorization: Bearer ${session?.access_token || ''}`
   to all nine, matching the two working examples.
2. **`/api/employees/notes` (GET/POST/DELETE) called no auth helper at all** — unlike
   `/api/employees` itself, which calls `requireAdministratorAccess`. The middleware fix above only
   proves the caller has *some* valid Supabase session; `/api/employees/notes` had nothing checking
   that session belonged to staff, let alone an administrator. A patient's own OTP session (the only
   kind of Supabase session a non-staff person can hold — see RISK-003/DEC-029) would have passed
   the middleware and been able to read or write internal employee notes. Found only because fixing
   bug 1 required reading this route's handlers to confirm what they actually enforce; not part of
   the original report. Fixed by adding the same `requireAdministratorAccess` gate `/api/employees`
   itself uses, to all three methods.

**Reason this wasn't a money route and so is a Medium, not the Critical severity RISK-018's money
routes carry:** employee notes are internal HR content, not a financial mutation. Still a real
IDOR-shaped gap — any authenticated non-staff user could read/write another party's HR notes — not
a cosmetic issue.

**Verify:** `npx tsc --noEmit` and `npx eslint` clean (5 pre-existing `prefer-const` errors at
`admin/page.tsx:768,1566` confirmed unrelated via `git stash` — present before and after this fix).
Manually exercise Provision Employee Credentials (create, delete, resend invite, role change) and
the employee notes panel as a staff `admin`/`superadmin` account before closing this row.

---

## RISK-022: A Non-Existent `customer_id` On A POS Sale Silently Loses Stock With No Discoverable Record

**Severity:** High · **Type:** Data integrity / RISK-014 regression
**Found:** 2026-07-26 (manually verifying `FINANCE_TRACKER.md` task 1.11 against deployed dev) ·
**RESOLVED 2026-07-26**

**How it was found:** deliberately testing task 1.11's "force a ledger-write failure, confirm the
POS sale itself still succeeds" checklist item, using a syntactically valid but non-existent
`customer_id`. The Phase 1 ledger dual-write did fail as expected — but so did something the
checklist wasn't asking about: the **native `product_sales` insert itself** failed too, silently.

**Root cause:** `product_sales.customer_id` has a foreign key to `customers.id`
(`20260725160000_add_customer_id_to_product_sales.sql`). `mapSaleToDbRow()` in
`src/app/api/inventory/products/sales/route.ts` passes whatever `customer_id` the request sends
straight through with no existence check first. A stale or mistyped `customer_id` (e.g. a customer
record that was later deleted, or a typo from a barcode/manual-entry error) violates that FK, and
the insert fails with Postgres error `23503` — **exactly RISK-014's original failure signature**,
just triggered by a different input than the column-name mismatch RISK-014 fixed.

**Consequence, confirmed live against dev (`sale-1785071843480-pbysm`,
`sale-1785071922006-nni32`):**
1. `deductInventoryStock()` runs **unconditionally** after the insert attempt, regardless of
   whether it succeeded — stock left the building for real.
2. The failed native insert falls through to the `page_settings` blob (the same fallback RISK-014
   already established), and the API still responds `{success: true}` to the cashier.
3. `getStoredSalesData()`'s read path trusts the native `product_sales` table **exclusively** once
   it has any rows at all, never merging the blob back in — so once a clinic has made even one
   real sale, every sale that falls into this trap becomes **permanently invisible** in sales
   history and any report built on `product_sales`. Reproduced twice in a row against dev; not a
   one-off blip. Verified by direct insert reproduction: `product_sales_customer_id_fkey` violation
   (`23503`), `Key (customer_id)=(...) is not present in table "customers".`

**Fix:** `POST /api/inventory/products/sales` now verifies `customer_id` resolves to a real
`customers` row **before** touching stock or attempting any write, returning a clean `404` instead
of silently degrading. Restores the intended RISK-014 behavior ("surface the reason rather than
failing over silently") for this specific trigger.

**Verify:** `npx tsc --noEmit` / `npx eslint` clean. POST with a non-existent `customer_id` now
returns `404` before any stock or ledger write happens; a real `customer_id` still sells normally
(re-verified against dev — see `ai_docs/manual_tests/FINANCE_PHASE_1_MANUAL_TESTS.md` task 1.11 evidence).

**A second, related bug found while reproducing this, NOT fixed here — the `page_settings`
fallback itself silently discards its own history.** `POST`'s fallback branch computes what to
write as `[newSale, ...(await getStoredSalesData()).sales]` — but `getStoredSalesData()` prefers
the **native** table once it has any rows, so on every failed insert this overwrites the whole
blob with `[thisSale, ...nativeRows]`, discarding any previously-accumulated fallback entries from
earlier failed inserts. Confirmed live: 5 sequential ghost-customer POSTs each deducted stock
(`stock_quantity` dropped by exactly 5), but only the **last** one's entry survived in the blob —
the other 4 were silently overwritten by each other, one at a time. This RISK-022 fix (validating
`customer_id` up front) prevents this specific trigger from ever reaching that broken path again,
but the fallback write logic itself is still broken for any *other* reason a `product_sales` insert
might fail (a bad `product_id`, a transient DB error, a future schema change) — worth its own pass
if the fallback path is meant to be a real safety net rather than effectively "keep only the most
recent failure."

---

## RISK-023: The Patient List Could Silently Never Load, Depending On A Session Race

**Severity:** Medium · **Type:** Availability / race condition
**Found:** 2026-07-27 (user reported "Select Patient" was empty while testing the Sell Product
flow) · **RESOLVED 2026-07-27**

**Root cause:** `fetchCustomers()` (`src/app/admin/page.tsx`) was called exactly once, inside the
component's mount-only `useEffect(() => {...}, [])`. Supabase's `session` resolves asynchronously
(`getSession()` / `onAuthStateChange`), so this raced it: if `session?.access_token` wasn't
populated yet at the exact moment that effect ran, `fetchCustomers` hit its own early-return guard
and did nothing — no error, no retry, `dbCustomers` just stayed `[]` for the rest of the tab's
lifetime. Every screen that lists or searches patients (Customers tab, and the "Select Patient"
picker inside Sell Product) reads from `dbCustomers` via the `customers` memo, so all of them would
silently show empty depending on how fast the browser's Supabase session happened to resolve —
not a deterministic bug, which is why it wasn't caught earlier.

**Why sales/devices/products didn't have this bug:** `fetchInventoryProducts` and
`fetchInventoryDevices` were already `useCallback`s keyed on `[session]`, each paired with a
`useEffect` that depends on the callback itself — so the moment `session` actually resolves, the
callback's identity changes and the effect re-fires automatically. `fetchCustomers` was a plain
function with no such pairing.

**Fix:** Converted `fetchCustomers` to the same `useCallback(..., [session])` +
`useEffect(() => { fetchCustomers(); }, [fetchCustomers])` pattern, and removed the now-redundant
direct call from the original mount-only effect.

**Verify:** `npx tsc --noEmit` / `npx eslint` clean. Reload `/admin` repeatedly and confirm the
Customers list and the Sell Product "Select Patient" dropdown populate every time, not just when
the session happens to resolve before that first effect runs.

---

## RISK-024: Selling More Units Than Are In Stock Was Never Rejected Server-Side

**Severity:** Medium · **Type:** Data integrity
**Found:** 2026-07-27 (user asked whether overselling was handled) · **RESOLVED 2026-07-27**

**Root cause:** The admin UI blocks selling more than `selectedSellProduct.stock_quantity` shows
(`admin/page.tsx`, `handleConfirmSellProduct`) — but that's a client-side check against a value
that can be stale (state fetched earlier, or two staff members selling around the same time).
`POST /api/inventory/products/sales` never independently verified quantity against current stock:
it always recorded the sale and called `deductInventoryStock`, which clamps the result at 0 rather
than rejecting. A bypassed or raced client check would therefore have recorded full revenue against
a quantity the clinic never actually had, with the product simply pinned at 0 stock and no error
anywhere.

**Fix:** `POST /api/inventory/products/sales` now re-reads the product's current
`inventory_products.stock_quantity` before writing anything, and returns `409` if the requested
quantity exceeds it. Skips the check (rather than failing closed) if the product isn't found in the
native table — consistent with this route's existing tolerance for the `page_settings` fallback
covering products not yet synced to the real table.

**Verify:** `npx tsc --noEmit` / `npx eslint` clean. POST a quantity greater than a product's real
stock and confirm a `409` with no stock/customer-spend/ledger writes; a valid quantity still sells
normally.

---

## RISK-025: The Entire Admin "Services" Screen Is a Parallel Universe — It Never Talks to the Database (RESOLVED)

**Severity:** High · **Type:** Data integrity / architecture
**Found:** 2026-07-27, while scoping Phase 3B task 3B.2 (`services.duration_minutes` UI wiring) ·
**Status:** Resolved 2026-07-27

### Summary

Everything a staff member does in the admin panel's **Services** section (Bookings sidebar →
Services: add, edit, delete, reorder, toggle visible/active, edit branch pricing) is written
**only** to the browser's `localStorage`. **None of it ever reaches the real `services` table in
Supabase.** The real table already has a working, staff-gated-looking `POST /api/services` route —
it is simply never called by anything. Meanwhile, `services.duration_minutes`,
`services.price`, and every other column on that real table are what actually drive live booking
behavior server-side (availability slot generation, reservation pricing, doctor payroll). The
two have no path to reconcile. This makes 3B.2 as originally scoped ("add a numeric
`duration_minutes` field to the Edit Service modal") pointless on its own: the field would save,
look correct in the UI, and never affect a single real booking, because the modal doesn't save to
the database at all.

### Evidence (measured, not assumed — every claim below is a grep/read, not an inference)

**The admin UI never calls the write API:**
- `grep -n "fetch(.*\/api\/services" src/app/admin/page.tsx` → **zero matches.**
- `grep -n "/api/services" src` → exactly two files: `src/app/api/services/route.ts` (the route
  itself) and `src/app/profile/page.tsx:135` — a **`GET`** only, from the patient-facing profile
  page. `POST /api/services` (`src/app/api/services/route.ts:72-91`) has **no caller anywhere in
  the codebase.**

**Every service mutation in the admin goes through one localStorage function, never the API:**
`saveDynamicServices()` (`src/lib/serviceStore.ts:89-93`) is called from 9 sites in
`admin/page.tsx` — lines 1576, 1609, 1636, 1683, 1718, 8561, 8928 (Edit Service save), 8962 (Add
Service save) — every single one writes to `localStorage.setItem(SERVICES_KEY, ...)` and nothing
else:
```ts
export function saveDynamicServices(services: ServiceItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
  window.dispatchEvent(new StorageEvent("storage", { key: SERVICES_KEY }));
}
```

**The admin UI never reads from the database either.** `localServices` (`admin/page.tsx:1402`,
the state every Services screen reads/edits) is populated exactly once, at
`admin/page.tsx:3100-3104`:
```ts
useEffect(() => {
  const svcs = getDynamicServices();   // reads localStorage, or seeds from the hardcoded
  setLocalServices(svcs);               // SERVICES array in src/lib/services.ts on first run
  ...
}, []);
```
`getDynamicServices()` (`serviceStore.ts:51-86`) reads `localStorage`, and if empty, seeds from
the **hardcoded constant array** `SERVICES` in `src/lib/services.ts` — never from
`GET /api/services`.

**New IDs are generated client-side with no relation to the real table's sequence.** Add Service
(`admin/page.tsx:8941`): `const newId = Math.max(0, ...localServices.map(s => s.id)) + 1;` —
a plain integer derived from whatever's currently in localStorage. The real `services.id` is a
`bigint identity` column (`DB_SCHEMA.md`). These two ID spaces have no reason to agree; a naive
future sync would risk overwriting an unrelated real row that happens to share a locally-generated
ID.

**The real table is what actually matters to a live booking.** All of these read the real
`services` table server-side, independent of anything in localStorage:
- `src/app/api/availability/route.ts:29` — `select('id, duration, duration_minutes')`, used to
  generate bookable time slots.
- `src/app/api/reservations/route.ts:254,396,507,712,740` — booking creation/approval/pricing.
- `src/app/api/hr/doctor-payroll/route.ts:66,171` — `select('id, price')` for commission math.

So the real table (whatever is in it right now — seeded once, or hand-edited via SQL/Supabase
dashboard; this session did not audit how it currently got its data) governs real bookings, prices,
and payroll, while the entire admin **Services** screen is a browser-local sandbox that looks
exactly like a working CRUD screen and has no effect on any of that.

### Why this is worse than RISK-004 as previously written

RISK-004 said "Supabase is synced only on explicit save actions" — implying a save *does*
eventually reach Supabase, just not continuously. That's not what's happening. There is no code
path, anywhere, that syncs an admin-entered service to the database. "Synced on save" would be a
staleness risk; "never synced" is a **silent total disconnect** — the admin can confidently believe
they've updated a service (price, duration, category, branch pricing, visibility) and be
completely wrong, with no error, no warning, and no way to notice short of comparing the DB
directly.

### Why this matters specifically for Phase 3B / PROPOSAL-002

Task 3B.2 exists because "every capacity and room-utilisation figure so far assumed 30 minutes for
every service" (task 0.8's own finding) and Phase 4/5's margin-per-minute math depends on
`duration_minutes` being real. But that number is read from the **database**
(`getServiceDurationMinutes()` queries service rows the API/DB returns). If staff "fix" a service's
duration in the admin UI, believing they've solved the problem, nothing downstream changes — the
number Phase 4/5 actually uses never moved. **Any Phase 3B/4/5 work that assumes "staff can correct
this from the admin panel" is unverified until this is fixed**, not just for duration —
for every field in the Services screen.

### Resolution

Chosen option 2 — full database-primary cutover for services.

- `src/app/api/services/route.ts` now requires `requireStaffAccess` for `POST` and `DELETE`. The
  `POST` upsert accepts an explicit `duration_minutes` value from the admin UI, falls back to parsing
  the legacy `duration` string when absent, and validates the value is a finite number `> 0` and
  `<= 1440` before any database write, returning a clear 400 instead of a raw Postgres error.
- `src/app/admin/page.tsx` loads services on mount from `GET /api/services` instead of
  `getDynamicServices()`, and all save/add/delete/reorder operations call `POST /api/services` or
  `DELETE /api/services` with the bearer token from the authenticated session. The service modal now
  exposes a numeric "Duration (minutes)" input that stays in sync with the legacy duration dropdown
  and is included in the upsert payload.
- Client-side integer ID generation (`Math.max(...)+1`) is replaced by the database identity column;
  new services are sent with a placeholder id and the database returns the real id.
- `src/components/ServicesSection.tsx`, `src/components/HomeServicesSection.tsx`, and
  `src/components/BookingModal.tsx` now fetch services from `GET /api/services` instead of reading
  the stale `localStorage` copy, so public-facing pages reflect admin edits.
- Service toggles (visible/active) and dynamic categories remain in `localStorage` as UI state only;
  the authoritative service record (price, duration, branch pricing, promotions, etc.) is now the
  database row.

### Verify

- `grep -n "fetch(.*\/api\/services" src/app/admin/page.tsx` now returns multiple matches for
  `loadServicesFromApi`, `syncServicesToApi`, and `deleteServiceFromApi`.
- `npx tsc --noEmit` passes and the only remaining `next lint` findings are pre-existing warnings
  (unused imports and `<img>` optimization suggestions), with zero errors.
- Edit a service's duration in the admin UI; confirm the **database row** changes (`select
  duration_minutes from services where id = ...`), not just what's shown in the browser.
- Reload the admin panel in a **different browser/incognito window**; the edited service should
  show the new value (proves it's no longer localStorage-only).
- A live booking end-to-end check (create a reservation for a service whose duration was just
  edited in the admin, confirm the slot grid uses the new duration) is the real proof, not just a
  passing typecheck.

---

## RISK-026: Clinic Devices Read Blob-Shape Field Names That Don't Exist On The Real Table

**Severity:** High · **Type:** Data integrity
**Found:** 2026-07-27, while doing Phase 3B task 3B.4 (`lamp_replacement_cost` + rated pulses) ·
**RESOLVED 2026-07-27** (the specific field-name mismatch below; a related unresolved item is
noted at the end)

**Root cause:** The real `inventory_devices` table (verified against
`supabase/migrations/20260726000000_dev_schema_baseline.sql` and
`20260726011400_add_inventory_devices_lamp_replacement_cost.sql`, not assumed) has exactly:
`id, name, serial_number, model, branch_name, status, total_pulses, remaining_pulses,
max_pulses_limit, lamp_replacement_cost, last_maintenance_date, next_maintenance_date,
created_at, updated_at`. It has **no** `current_pulse_count`, `warning_threshold_1`,
`maintenance_threshold_2`, `initial_pulse_count`, `total_lifetime_pulses`, or `category` columns
at all — those exist only in the legacy "blob shape" (`DEFAULT_DEVICES`, and every POST/PUT body in
`src/app/api/inventory/devices/route.ts`), a holdover from before the real table existed.

`GET /api/inventory/devices`'s status-computation step, and **every single read site in
`admin/page.tsx`** (device list stat cards, the pulse-update modal, the reset-pulses modal, the
Edit Device form's default values — confirmed by grepping every occurrence of
`current_pulse_count`/`warning_threshold_1`/`maintenance_threshold_2` in that file), read
exclusively the blob-shape names. `getStoredInventoryData()` returns raw rows straight from
`select('*')` on the real table when it has data — so every one of those reads silently resolved to
`undefined`, and every `Number(dev.current_pulse_count) || 0` / `|| 80000` / `|| 100000` fallback
kicked in unconditionally. **Practical effect: as soon as the real table has any rows, every
device's displayed pulse count reads as 0, every threshold reads as the hardcoded default, and
status always computes as "Optimal" — regardless of what's actually stored.** This is the same
class of bug as RISK-025 (blob/table shape divergence), just on the read side only — the *write*
side (`saveInventoryData`'s `sqlRows` mapper) was already correctly writing to the real table's
columns; the display just never reflected it back.

**Why 3B.4 specifically surfaced this:** the task asked to "confirm `max_pulses_limit` is genuinely
settable, not only defaulted to 100000 in code." Tracing that through found it *was* settable (the
write path was fine) but **never displayed correctly on reload** — which would have made the task's
own verify step fail if actually tested against live data, the same way the null-duration bug would
have failed 3B.2's verify step if not caught first.

**Fix:** added `normalizeDeviceRow()` in `src/app/api/inventory/devices/route.ts`, applied to every
row `getStoredInventoryData()` returns from the real table. It backfills the blob-shape names from
the real columns when absent: `current_pulse_count ← total_pulses`,
`maintenance_threshold_2 ← max_pulses_limit`. `warning_threshold_1` has no real-table equivalent to
fall back to at all (the real schema only ever had one ceiling, not a two-tier warning/critical
model) — derived as 80% of the real ceiling, matching the ratio `DEFAULT_DEVICES`' own seed data
already used.

**Not fixed here, worth checking separately:** `src/app/api/inventory/devices/[id]/reset-pulses/route.ts`
reads and writes **only** `page_settings` (the blob) — it has no `supabaseServer.from('inventory_devices')`
call at all, unlike the main route. `DB_SCHEMA.md`'s `inventory_devices` entry states this route is
"confirmed wired," which this session did not re-verify and now has reason to doubt (same class of
stale-doc risk RISK-020 exists to warn about). If the real table and the blob have diverged (very
possible, since nothing keeps them in sync on this path), resetting a device's pulse count here may
not affect what the main route's normalized read actually shows. Flagging, not fixing — out of
scope for 3B.4.

**Verify:** `npx tsc --noEmit`, `npx eslint`, and `npx next build` all clean. Set a device's
Maintenance Threshold 2 and Lamp Replacement Cost, save, reload the page, and confirm both values
persist and display correctly rather than resetting to defaults.

---

## RISK-027: Completing a Booking Charged Material/Device Cost Without Ever Deducting The Stock Or Pulses That Caused It

**Severity:** High · **Type:** Data integrity
**Found:** 2026-07-27, by the user manually completing a real test booking (service "Skin Care
Treatments" with a "Hamada Botox" consumable in its recipe) and noticing the product's stock count
never moved · **RESOLVED 2026-07-27**

**Root cause:** `applyCheckoutCosting` in `src/app/api/reservations/route.ts` — the function that
runs when a booking's status transitions to `completed` — correctly computes and snapshots
`invoice_lines.cogs_snapshot` from the service's `service_consumables` recipe (3B.5) and
`service_devices` pulse links (3B.6), and correctly writes `consumption_entries` and a
`stock_movements` ledger row (`direction: 'out', reason: 'consumption'`) for each material used.
**It never called anything that actually decremented `inventory_products.stock_quantity`** — the
scalar every admin screen (Products Catalog, Stock Valuation, Low Stock Alerts, the notification
bell) actually reads. Exactly the same story on the device side: the function reads
`lamp_replacement_cost`/`max_pulses_limit` to charge the session for device wear, but never
incremented `inventory_devices.current_pulse_count` — so a device could be charged for pulses
whose count it would never itself register, `RISK-026`'s maintenance thresholds never advancing no
matter how many sessions ran.

**Why this is the same class of bug as `RISK-025`/task 3B.10, not a new kind of mistake:** this
codebase's `stock_movements`/ledger tables were built (Phase 2) as an audit trail alongside the
directly-written scalars (`stock_quantity`, `current_pulse_count`) — not yet a replacement for them
(task 2.12 is explicitly comparison-only). Every write path needs its own call to the scalar-owning
helper; the purchases (restock) side of this exact gap was found and fixed in task 3B.10
(`restockInventoryProduct`). Checkout consumption and device-pulse consumption had the identical gap
on the *consuming* side, just never exercised until this session's recipe/device editors (3B.5/3B.6)
made it possible to configure a recipe and actually test a real booking against it — which is
exactly how the user found it.

**Fix:**
- `src/app/api/reservations/route.ts` now calls the existing `deductInventoryStock()` (already used
  by POS sales, `src/app/api/inventory/products/route.ts`) once per consumption entry, immediately
  after the `stock_movements` row is written.
- Added a new exported `incrementDevicePulses()` in `src/app/api/inventory/devices/route.ts`
  (mirroring `restockInventoryProduct`'s shape) and call it once per `service_devices` link, after
  computing that line's device cost. Recomputes `warning_1_notified`/`warning_2_notified`/`status`
  the same way the device PUT handler does, so a session that pushes a device past its threshold
  is reflected immediately, not just on the next manual pulse update.
- Both loops are sequential, not `Promise.all` — same reasoning as `restockInventoryProduct`:
  these are read-modify-write operations over the whole catalog/device list, so two rows for the
  same product/device in one booking would race and lose an update.
- Both calls stay inside the existing per-invoice-line `try`/`catch` — a failure here still only
  leaves that one line's `cogs_snapshot` `NULL`, not every line on the booking (the isolation
  `applyCheckoutCosting` already had for exactly this reason).

**Verify:** `npx tsc --noEmit`, `npx eslint`, `npx next build` all clean. Define a recipe for a
service, note a product's current stock, complete a real booking for that service, and confirm the
product's `stock_quantity` decreased by exactly the recipe's `standard_qty` (not just that
`consumption_entries`/`stock_movements` got a row). Same check for a service with a device link —
confirm `current_pulse_count` increased by `pulses_per_session`.

---

## RISK-028: A Repeat Booking Under The Same Phone Number Never Updated The Customer's Name/Email

**Severity:** Medium · **Type:** Data integrity
**Found:** 2026-07-27, by the user's own manual test booking not appearing findable by name in the
Customers list · **RESOLVED 2026-07-27**

**Root cause:** `POST /api/reservations`'s "Lookup or create customer profile" step
(`src/app/api/reservations/route.ts`) matches an existing customer by **phone number only**. When
a match is found, it incremented `number_of_bookings` — but never touched `name` or `email`. Real,
live-queried data caught this directly: two bookings under phone `01234567890`, first as "Hamada
Meeting" (`214321421489127@gmail.com`), later as "Test Botox Product"
(`12842184712@gmail.com`). Both reservations correctly recorded their own name/email and correctly
linked to the same `customer_id` — but the `customers` row itself stayed frozen as "Hamada Meeting"
forever, because only the *first* booking under that phone ever wrote to it. Searching the
Customers list (or the Sell Product patient picker) for "Test Botox Product" found nothing, even
though a real, current booking for that name clearly existed — because the underlying customer
record was never told about it.

**Not a missing-customer bug — a stale-customer bug.** The customer row existed the whole time
(confirmed via direct query); it just displayed outdated information no search for the *new* name
would ever match.

**Fix:** the update now also sets `name`/`email` to the current booking's values whenever an
existing customer is matched by phone — the same "phone is the identity anchor, most recent booking
wins" model `isOwnIdentity()` (DEC-029) already uses for authorization, now applied consistently to
what gets displayed too.

**Known, accepted trade-off — not fixed, inherent to phone-as-identity:** if two different real
people genuinely share one phone number (a common household pattern), whichever books more recently
now overwrites the other's name/email on the shared customer record. This is not a new flaw
introduced by this fix — the system already treats one phone number as one customer identity
everywhere else (`isOwnIdentity`, the lookup itself); this fix just makes the record's *displayed*
fields consistent with that existing model instead of silently drifting from it.

**Verify:** `npx tsc --noEmit`, `npx eslint`, `npx next build` all clean. Book twice with the same
phone number under two different names; confirm the customer record's `name`/`email` reflect the
second booking, not the first.

---

## RISK-030: Promotions Discounts Are Marketing-Only — Never Applied At Booking Or Checkout, And Business Value Is Undefined (RESOLVED)

**Manual test checklist:** `ai_docs/manual_tests/PACKAGES_AND_PROMOTIONS_MANUAL_TESTS.md` (section 1) — also
covers the related Packages public-display (DEC-034) and sell/redeem (DEC-035) work shipped in
the same session.

**Severity:** Medium · **Type:** Product definition / customer trust
**Found:** 2026-07-28, while comparing the Packages admin feature (3B.8) to the Promotions nav
tab, during a documentation pass — not a user-reported bug.
**Status:** Resolved 2026-07-28 — product decision made: promotions are a real, checkout-enforced
discount (not a marketing-only teaser). Clarification from the dev team that promotions are
"connected to the Branches table" was correct but answered a different question — that's how a
promotion is *scoped* (per-branch, via `branchPricing[]`), not whether it was *enforced* when
money changed hands. Investigation found most charge paths already called the correct
`getEffectiveServicePrice()` helper (booking creation, admin checkout/invoice-preview); three
remaining gaps were fixed: (1) `BookingModal.tsx`'s deposit calc/display used the raw
undiscounted `selectedService.price` instead of `getEffectiveServicePrice()`; (2) admin's
"Mark Deposit as Paid" panel (`admin/page.tsx`, `pending_deposit` bookings) had the same raw-price
bug; (3) `writeCheckoutInvoice()` in `api/reservations/route.ts` passed the already-discounted
price as `unitPrice` with `discount` always `0`, so invoices never recorded that a promotion
applied — now uses `getServicePriceDetails()` to record `unitPrice: basePrice` and
`discount: basePrice - discountedPrice` (mirrors the existing `cogs_snapshot`/
`commission_snapshot` write-once pattern), so `invoices.discount_total` is now populated and the
actual charge (`line_total`) is unchanged.

**What it is:** `admin/page.tsx`'s "Promotions" nav tab (`activeNav === "Promotions"`, lines
~9352+) lets staff attach a percentage or fixed-amount discount, with optional start/end dates,
to one service at one branch. Unlike RISK-004's old service-store pattern, this **does** persist
for real: `handleSavePromotion`/`handleDeletePromotion`/`handleTogglePromotion` write into
`branchPricing[].promotion` on the service object and call `syncServicesToApi`, which `POST`s to
`/api/services` and lands in the real `services.branch_pricing` JSONB column. It survives a
refresh and a different browser. So this is not the RISK-004/RISK-025 "parallel universe" bug —
the data is real.

**The gap:** the discount is only ever read back in one place —
`getServicePriceDetails()` (`src/lib/services.ts:274-358`), consumed exclusively by
`HomeServicesSection.tsx` and `ServicesSection.tsx` to render a "20% OFF" badge and a
struck-through price on the public marketing pages. Nothing else reads it:
- `BookingModal.tsx` prices a booking (and its deposit) off `selectedService.price` — the flat
  top-level price — never `getServicePriceDetails()` or `branchPricing[].promotion`.
- The admin checkout modal (`checkoutBooking`) computes `totalCost` from the service price the
  same way; RISK-029's deposit fix didn't touch this path either.
- No invoice/ledger code (`src/lib/ledger.ts`, `src/lib/billing.ts`) references `promotion` at
  all.

**Consequence:** a patient can see "SAVE 100 EGP" on the services page, then get quoted and
charged the full undiscounted price the moment they actually book or check out — the discount
never reaches money. That's a bait-pricing / trust problem for a clinic, not just a missing
feature, and staff have no way to honor the advertised price without manually discounting at
checkout (which nothing in the UI prompts them to do).

**Open question — not resolved here, needs a product decision:** is Promotions meant to be a
real, checkout-enforced discount (in which case it needs `getServicePriceDetails()` wired into
`BookingModal` pricing/deposit calc and into `checkoutBooking`'s `totalCost`, plus a discount
line on the invoice so reporting isn't misleading), or is it meant to stay a marketing-page-only
"as low as" teaser with a disclaimer that final price is confirmed at booking? Either is a
legitimate choice for a clinic, but right now the UI (percent off, a date range, an "Enabled"
toggle) reads exactly like a real discount system, which is misleading for whoever configures it
without reading the code. Log the decision in `DECISIONS.md` once made.

---

## RISK-029: Checkout Charged The Full Service Price Again, Ignoring The Deposit Already Paid

**Manual test checklist:** `ai_docs/manual_tests/RISK_029_MANUAL_TESTS.md` — covers this fix, the cancel/no-show
refund/forfeit policy, postpone, and RISK-027/RISK-028 checks from the same testing session.

**Severity:** High · **Type:** Data integrity / money
**Found:** 2026-07-27, by the user's own manual test — a booking with a 30%-style deposit already
paid showed the full service price due at checkout, not the remaining balance · **RESOLVED
2026-07-27**

**Root cause:** `BookingModal.tsx`'s "declare deposit paid" step already correctly writes
`reservations.amount_paid` (deposit amount) and `amount_left` (remaining balance) when a patient
pays their reservation deposit. But the admin's checkout modal (`admin/page.tsx`,
`checkoutBooking` render) recomputed `totalCost` from the service's full price and used it
directly as the amount due — it never read `checkoutBooking.amountPaid` (the deposit already on
file) at all. Staff saw "Total Cost: 120 EGP" and were expected to collect the full amount again,
even though the patient had already paid 36 EGP of it.

**A second, deeper bug this exposed:** `computeSettledBalances` (`src/lib/billing.ts`) treats
`amountPaid` sent on the *first* completing PATCH as the booking's **final total paid**, not a
delta for that one payment (`spentDelta = wasCompleted ? newPaid - oldPaid : newPaid` — the
non-completed branch uses `newPaid` directly). The old checkout code sent only what staff typed
into "Amount Paid" at checkout — so even if a staff member manually figured out the correct
remaining balance and collected it, the deposit portion would never be added to
`customers.spent_amount`. The deposit money was real, collected, and recorded on the reservation
row — but silently absent from the customer's lifetime spend.

**Fix (`admin/page.tsx`, `checkoutBooking` modal):**
- `depositAlreadyPaid = checkoutBooking.amountPaid`; `balanceDue = totalCost - depositAlreadyPaid`
  is now what wallet deduction and "Net Due" are computed against, not the full `totalCost`.
- The modal now shows a breakdown when a deposit exists: Total Cost, Deposit Already Paid (as a
  negative line), Balance Due — instead of only ever showing the full price.
- The completing PATCH now sends `amountPaid: depositAlreadyPaid + amountPaidNum` (the cumulative
  total ever paid on the booking, matching what `computeSettledBalances` expects for a first
  completion) instead of just what was typed at this step. `amountLeft` is unchanged in formula
  (`remainingAmount`) — it already correctly nets out wallet deduction and this payment against
  the deposit-adjusted balance due once `netDue` itself was fixed.

**Verify:** `npx tsc --noEmit`, `npx eslint`, `npx next build` all clean.
`npx tsx scratch/depositcheckoutcheck.ts` — 3 scenarios (full remaining payment, partial remaining
payment leaving real debt, and a no-deposit booking behaving exactly as before), 6 assertions, all
pass. Live check still needed: book with a deposit, complete checkout, confirm the modal shows
Balance Due (not full price) and `customers.spent_amount` ends up equal to the full service price,
not just the checkout-time payment.

**Follow-up, done 2026-07-28 — the deposit refund-vs-forfeit policy.** Decisions taken with the
user: refund credits the patient's wallet (matches the existing checkout-change pattern, no real
cash payout tracked by this system); `cancelled` and `rejected` stay separate (`rejected` = staff
declines before commitment, no money involved, unchanged; `cancelled` = an accepted booking is
called off after a deposit was paid, now refunds); a distinct `no_show` status was added.
Deliberately **not** a clinic-level "deposits enabled" toggle — the refund/forfeit amount is
whatever `amount_paid` actually is on the reservation, so a clinic with deposits disabled
(`depositPercentage = 0`) automatically has nothing to refund or forfeit, no special-casing needed.

- Migration `20260728000000_add_no_show_and_postponed_reservation_status.sql` adds `no_show` (and
  `postponed`, see below — added together since both needed the same CHECK constraint edit) to
  `reservations_status_check`.
- `POST /api/reservations` PATCH gained `action: 'cancel'` (refund) and `action: 'no_show'`
  (forfeit) — see `API_CONTRACT.md` for the exact field-level behavior. Both are idempotent and
  blocked once a booking is `completed` or already in a terminal cancel/no-show state.
- **A "Postponed" status was added in the same pass** (user request, same conversation): a
  non-terminal state for "patient can't make this date, but isn't cancelling" — moves no money.
  Two paths through one `action: 'postpone'`: a known new date/time reschedules directly (no
  status change beyond returning to `'approved'` if it was already `'postponed'`); an unknown one
  sets status to `'postponed'` with a `follow_up_date` reminder (new nullable column, migration
  `20260728000100_add_reservations_follow_up_date.sql`) until staff comes back and reschedules it
  for real.
- Admin UI: Cancel / No Show / Postpone buttons added to the booking details drawer (available on
  any non-`started`, non-terminal booking), plus a Postpone modal offering both paths, plus
  `postponed`/`no_show` added to the bookings status filter and status-badge color mapping.

**Adjacent gap noticed, not addressed:** `Booking Settings` already has a "Cancellation Window
(Hours)" setting (`bookingCancelWindow`) whose own description says late cancellations "may
forfeit their deposit" — but nothing reads this setting anywhere; `cancel` always refunds
regardless of timing right now. Worth a future pass if the clinic actually wants late
cancellations to behave like a no-show rather than a full refund.

**Verify (this follow-up):** `npx tsc --noEmit`, `npx eslint`, `npx next build` all clean.
Live check still needed: cancel a booking with a paid deposit and confirm the wallet credits;
mark another as no-show and confirm `spent_amount` increases instead; postpone one via each path
and confirm the date-known path reschedules immediately while the follow-up path leaves it
findable under the new "Postponed" filter.

---

## RISK-031: New Packages/Promotions Admin UI Was Added Inline To `admin/page.tsx`, Violating DEC-027

**Severity:** Low · **Type:** Architecture / tech debt (not a correctness or money bug)
**Found:** 2026-07-28, self-flagged while auditing `ai_docs/` for staleness after shipping the
package sell/redeem/checkout feature — not a user-reported issue.

**What it is:** DEC-027 ("Modular Admin Sections Are Mandatory," 2026-07-26) requires every *new*
admin section to be built as a focused submodule under `src/components/admin/`, explicitly to stop
`src/app/admin/page.tsx` from growing further — existing legacy sections are only extracted
"incrementally when touched." The 2026-07-28 packages work added a genuinely new section (a
"Packages" tab in the customer profile, its sell-package modal, a new shared
`PatientPackagePromoBanner` component, and redemption logic inside the checkout modal) directly
inline into `admin/page.tsx`, mirroring the pre-existing (legacy, pre-DEC-027) "Products" tab
pattern instead of extracting a new module. `PackageAdminPanel.tsx` (the package *definitions*
CRUD screen, built earlier in 3B.8) correctly follows DEC-027 — only this session's customer-facing
sell/redeem/banner work does not.

**Why it happened this way:** the redemption logic sits inside the existing legacy Payment
Settlement (checkout) modal, which is itself unextracted — DEC-027 says existing sections get
pulled out "when touched," which arguably makes this checkout change the trigger for extracting
that modal. Given the checkout modal is the one money-critical surface in this feature (it's what
was flagged "take care, critical feature" for), a mid-implementation extraction was judged higher-
risk than shipping the fix in place and refactoring separately once it's verified working in the
browser.

**Consequence:** `admin/page.tsx` grew by ~550 lines in this change, working against DEC-027's
stated goal. No functional/money risk — this is purely a maintainability debt item.

**Recommended follow-up (not done here):** once the feature is verified live, extract into
`src/components/admin/packages/`: (1) the customer-profile "Packages" tab + sell modal as their
own component, (2) `PatientPackagePromoBanner` (already a clean, prop-driven, extractable
function), and (3) the checkout modal's redemption logic, ideally alongside finally extracting the
whole Payment Settlement modal into its own module per DEC-027's "extract when touched" clause.

**Partial update, 2026-07-29 (DEC-036):** while activating the "Marketing" nav section (moving
Promotions + Packages' admin screens out from under Services/their own top-level item), Promotions
was extracted into `src/components/admin/marketing/PromotionsAdminPanel.tsx` — this closes the
Promotions half of DEC-027 compliance (Promotions wasn't part of this risk's original scope, since
it predated DEC-027 and hadn't been touched yet; it's now been touched, and extracted properly).
**The original subject of this risk — the customer-profile "Packages" tab, `PatientPackagePromoBanner`,
and the checkout modal's redemption logic — is still unextracted and still open.**

---

## RISK-032: An Untrimmed/Differently-Formatted Phone Number Silently Forked A Duplicate Customer (RESOLVED)

**Manual test checklist:** `ai_docs/manual_tests/PACKAGES_AND_PROMOTIONS_MANUAL_TESTS.md` (section
4 covers the fix directly; the evidence log entry for section 3 documents how this was found).

**Severity:** Medium · **Type:** Data integrity
**Found:** 2026-07-28, live-testing package redemption (RISK-031/DEC-035 work) — a package sold to
"Hamada Patient" (mobile `01231456123`) never showed as redeemable on a booking made minutes later
for the same, visually-identical patient.
**Status:** Resolved 2026-07-28.

**What it is:** `POST /api/reservations`'s customer lookup did an exact string match —
`.eq('mobile', phone)` — with no trimming or normalization of the phone value the client sent. A
direct query against the dev database (`scratch/check_hamada_package.ts`) found the test booking's
phone had been entered as `"01231456123 "` (one trailing space), which doesn't `=== "01231456123"`
in Postgres either — so instead of matching the existing "Hamada Patient" customer (who already
had the package), the route silently created a **new, 5th "Hamada"-named customer** and linked the
reservation to that instead. Both records display identically in the UI ("Hamada Patient" /
"01231456123") since nothing trims for display, so the fork was invisible until the package failed
to show as redeemable and a raw DB query revealed the mismatch.

**Consequence, beyond blocking package redemption:** this is a general customer-identity bug, not
package-specific — a repeat patient with any incidental phone formatting difference (a stray
space, a `+20` prefix, etc.) between bookings would silently accumulate duplicate customer rows,
each with its own wallet/spend/outstanding history fragmented across the duplicates instead of one
accurate patient record.

**Fix:** `POST /api/reservations` now normalizes the phone with `normalizeEgyptMobile()`
(`src/lib/customerIdentity.ts` — already existed, already used by `isOwnIdentity()` for the same
class of problem on the patient-auth side, trims + normalizes `+20`/`20` prefixes) before the
lookup and before storing on a newly-created customer. Also added: a "Select Existing Patient"
search picker in the manual booking creation modal (`src/app/admin/page.tsx`), so staff can link a
booking to a known customer's real id directly instead of relying on phone-string matching at all
— `POST /api/reservations` now accepts an optional `customerId` that, when provided and valid,
bypasses the phone-matching path entirely.

**Not fixed here:** the handful of pre-existing duplicate customer rows this bug already created in
the dev database (mock data, disposable) — cleanup deferred pending explicit approval for the
database-mutation script, since Claude Code's auto-mode classifier blocks unattended DB writes.

---

## RISK-033: `services.id` Regressed To `GENERATED ALWAYS`, Silently Breaking Every Edit To An Existing Service

**Severity:** High · **Type:** Data integrity / silent failure
**Found:** 2026-07-29, while investigating why a Promotion appeared to save in the admin UI but
never persisted or showed on the public site — not a user-reported issue directly, but the fix
unblocks the user's own report.
**Status:** Migration written, **not yet applied** — needs `npx supabase db push` run by the user
(or approved when prompted); Claude Code's auto-mode classifier blocks unattended DB migrations.

**What it is:** the 2026-07-26 "dev schema baseline" migration
(`20260726000000_dev_schema_baseline.sql`) recreated `services.id` as
`GENERATED ALWAYS AS IDENTITY`. The pre-baseline legacy schema (`supabase/migrations/_legacy/`)
had it as `GENERATED BY DEFAULT AS IDENTITY`. Postgres rejects any INSERT/UPSERT statement that
includes an explicit value for a `GENERATED ALWAYS` identity column, unless the statement uses
`OVERRIDING SYSTEM VALUE` — which `@supabase/supabase-js`'s `.upsert()` does not add.
`POST /api/services` always includes `id` for an existing service (`mapServiceToDb`:
`if (s.id) row.id = s.id;`), so **every save of an existing service** — the entire Services admin
tab, and Promotions (which reads-modify-writes the whole services array) — has been silently
failing with Postgres error `428C9` ("cannot insert a non-DEFAULT value into column \"id\"")
since that migration took effect.

**Why it was invisible:** `syncServicesToApi()` (`src/app/admin/page.tsx`) only does
`console.error` on a failed sync and returns `null` — no alert, no thrown error the caller
surfaces to the user. The admin UI's local state update happens optimistically *before* the sync
call resolves, so a promotion (or any service edit) appears to save in the UI while the database
write silently 400s underneath. New service *creation* was unaffected (no `id` in that payload),
which is likely why this went unnoticed — only edits to already-existing rows hit the identity
conflict.

**Confirmed via direct DB query** (`scratch/check_promotions.ts`): zero services have ever had a
promotion recorded in `branch_pricing`. Reproduced the exact failure directly
(`scratch/test_promotion_upsert.ts`): a plain upsert of an existing service row with its `id`
returns Postgres error 428C9.

**Bonus finding while diagnosing this:** the earlier Packages public-display migration
(`20260728010000_packages_public_display_fields.sql`, adding `name_ar`/`show_on_website`) had
also never been applied to the remote dev database (`npx supabase migration list` showed both as
local-only) — so "Show on Website" and Arabic package names have likely never worked live either.

**Fix:** `supabase/migrations/20260729000000_fix_services_id_identity_generation.sql` —
`ALTER TABLE public.services ALTER COLUMN id SET GENERATED BY DEFAULT;`. Metadata-only, no data
changes; new-row creation is unaffected either way (still auto-generates when `id` is omitted).
**Must be applied** (`npx supabase db push`, which also picks up the still-pending 3B.13 packages
migration) before Promotions or any Services edit will actually persist.

---

## RISK-034: A Doctor's Same-Weekday Schedule Silently Reopened A Day The Clinic Was Marked Closed

**Severity:** High · **Type:** Booking integrity / data validation gap
**Found:** 2026-07-29, live-reported: a patient successfully booked and submitted a "pending"
appointment for Friday 2026-07-31 (New Cairo branch is closed Fridays), which staff then could
not approve.

**What it is:** `BookingModal.tsx`'s `getDayOperatingHours()` computes the bookable hours for a
selected date by (1) checking the branch's `service_hours` for that weekday's `isOpen` flag
(`clinicClosed`), then (2) scanning every doctor for a matching same-weekday schedule entry
(`found`). The `clinicClosed` short-circuit (`return { start: "23:59", end: "23:59" }`, which is
what disables the date in the calendar and empties the time-slot list) was only reached inside the
`else` branch of `if (found) {...} else { if (clinicClosed) {...} }` — i.e., **only when no doctor
had any schedule entry for that weekday at all**. If any doctor's `working_days_hours` happened to
have a Friday entry marked `isOpen: true` (plausible if a doctor's schedule was configured
independently of the clinic's closure days), `found` became `true`, and the function returned that
doctor's real hours — completely ignoring that the branch itself was closed. This let the date
picker treat Friday as bookable and populated real time slots, so the "Next" button engaged
normally through to submission.

There was also no defense-in-depth on the server: `POST /api/reservations` accepted `date`
unconditionally with no check against the branch's closed days — a public endpoint with no
server-side auth (CLAUDE.md rule 3), so even a client-side fix alone would leave a gap for any
future client bug or direct API call to create the same kind of booking.

**Fix:**
- `BookingModal.tsx`: moved the `clinicClosed` check to run unconditionally, before the
  `found`/doctor-schedule branch — clinic-level closure now always wins regardless of any
  individual doctor's schedule.
- `POST /api/reservations`: added a server-side check that rejects (`400`) a booking whose `date`
  falls on a weekday the branch (or, absent a branch, the default clinic hours) has marked closed.
  Deliberately skipped when `body.isManual` is true, since staff manually creating a booking may
  need to schedule a genuine one-off exception.
- **Follow-up, same day:** the admin "Approve" modal (`admin/page.tsx`, `openApprove`/`approve`)
  had no way to change the requested date at all — only the time slot, fixed to whatever date the
  patient originally picked. Combined with the bug above, a bad request landing on a closed day
  left staff stuck: unable to approve (no valid slot exists) and with no way to fix it short of
  rejecting the whole request. Added an "Appointment date" field to the approve modal — changing
  it re-derives available slots for the new date (reusing the existing, already-correct
  `getDayOperatingHoursApprove`), and `PATCH /api/reservations` (`action: 'approve'`) now accepts
  the same `date` field the `postpone` action already uses, updating the reservation's date/room/
  slot availability check against the newly-chosen date instead of the original one.

**Not fixed here:** the specific bad test booking already created for 2026-07-31 — either approve
it now with a corrected date via the fixed modal, or reject it via the normal admin "Reject"
action; no direct DB cleanup was done.

---

## RISK-035: Package-Redeemed Visits Were Invoiced At Full Price, Double-Counting Revenue And Creating Phantom Receivables

**Severity:** Critical · **Type:** Financial data integrity · **Found:** 2026-07-29, while
building PROPOSAL-002 Phase 4's P&L report (task 4.6) · **RESOLVED 2026-07-29**

**What it is:** Checkout (`writeCheckoutInvoice` in `POST`/`PATCH /api/reservations`) invoices
every service on a completed booking at its full list price — it has no concept of packages at
all. Separately, `POST /api/packages/consume` (task 1.13) records the *correct* revenue for a
package-covered visit in `package_revenue_recognitions`, per DEC-023. The admin checkout UI
already computes which services in a booking are redeemed against an existing package
(`redeemedPackageItems`, used to correctly exclude them from what the patient is charged
client-side) — but never sent that information to the server. The result, confirmed against a
real redemption already in dev data: a patient using a pre-paid session generated **both** the
correct `package_revenue_recognitions` entry (EGP 166.67) **and** a full-price, unpaid invoice
(EGP 100) for the same visit, with real `cogs_snapshot`/`commission_snapshot` costing correctly
attached to that same phantom line.

**Consequence, confirmed on real (mock) data, not theoretical:**
1. **Revenue double-counted.** `GET /api/finance/pnl` (and everything built on it — 4.8's doctor/
   branch P&L) counted the phantom full-price line *and* the correct recognition for the same
   session, inflating revenue for any period with package activity.
2. **Phantom receivable.** The unpaid phantom invoice showed up in `GET /api/finance/receivables-
   aging` as a real patient debt. The patient owed nothing — they pre-paid weeks earlier via the
   package.
3. **Cost tracking was correct** — `applyCheckoutCosting` (task 2.11) runs on every invoice line
   regardless of price, so `cogs_snapshot`/`commission_snapshot` for a package-delivered session
   were always accurate. Only the revenue side was wrong.

**Fix:**
- `writeCheckoutInvoice` accepts a new `redeemedServiceIds: number[]` param. For any service in
  that set, the invoice line is still written (list `unit_price`, for the audit trail) but with
  `discount` equal to the full price, making `line_total: 0` — the visit stays on the invoice and
  its `cogs_snapshot`/`commission_snapshot` are computed exactly as before; only the phantom
  revenue is suppressed. A `(package redemption)` suffix is added to the line description so it
  reads clearly on the invoice itself.
- `PATCH /api/reservations` accepts `redeemedServiceIds` in the request body and passes it
  through — see `API_CONTRACT.md`.
- `admin/page.tsx`'s checkout handler now sends `redeemedServiceIds: Object.keys(redeemedPackageItems).map(Number)` —
  data the client already had, just never transmitted.
- The one existing bad invoice/line in dev (`INV-000021`) was corrected in place to match what the
  fix now produces (`line_total`/`grand_total` zeroed, `cogs_snapshot` untouched) — dev data is
  mock (DEC-026), no broader backfill needed.

**Verified:** `scratch/risk035_check.ts` — creates an isolated service/customer/reservation,
completes checkout with `redeemedServiceIds` set, and confirms the invoice is written (audit
trail preserved), `line_total`/`grand_total` are 0, `cogs_snapshot` is still computed, no
`payments` row is created, and `GET /api/finance/receivables-aging` does not list it as
outstanding — 10/10 checks pass. Separately confirmed a normal (non-package) checkout with no
`redeemedServiceIds` still charges full price, unaffected by this change.

**Manual test checklist:** `ai_docs/manual_tests/RISK_035_MANUAL_TESTS.md`.

---

## RISK-036: Several PHI and Config-Mutating Routes Have No Server-Side Authorization At All (PARTIALLY RESOLVED)

**Severity:** High (medical-records/prescriptions) / Medium (config/CMS routes) · **Type:** Security
**Found:** 2026-08-03, during an audit written while producing `ai_docs/SECURITY.md`

**What it is:** RISK-018 (2026-07-25/26) authorized every *finance-relevant* unauthenticated route
it found, but was explicitly scoped to money-mutating routes. A follow-up audit — grepping all 69
`route.ts` files for the `access.ts` helpers, then checking each unprotected file's exported HTTP
methods — found it missed a second, non-finance group that is still fully open:

- **`medical-records` and `prescriptions`** (GET/POST/DELETE, no auth of any kind): PHI. Anyone who
  knows or guesses a `customer_id` can read, overwrite, or delete another patient's medical intake
  form, uploaded reports, or prescription history.
- **`branches`, `categories`, `providers`, `rooms`, `service-rooms`, `terms`, `clinic-settings`,
  `page-settings`, `customer-avatars`, `provider-attendance`** (various POST/PATCH/DELETE, no auth):
  anyone can create/edit/delete branches, categories, doctor records, rooms, room-service links,
  the public Terms & Conditions text, CMS content (defacement), a customer's avatar, or forge a
  doctor attendance record.
- **`hr/alerts`, `hr/attendance`, `hr/doctor-payroll`, `hr/leaves`, `hr/payroll`, `hr/performance`,
  `providers/schedule-audit-logs`** are covered by `middleware.ts`'s `PROTECTED_API_PREFIXES`, but
  that only proves "a valid Supabase session" — since patient OTP login is real Supabase Auth
  (RISK-003), a logged-in *patient* token satisfies this middleware. There is no route-level role
  check confirming the caller is staff.
- `translate` (POST, no auth): if this proxies a paid third-party API, it's an open cost-abuse
  vector, not a data-exposure one.

Full per-route table with methods: `ai_docs/SECURITY.md` §3.

**Not yet fixed** — this entry documents the finding, matching this project's own rule that a new
security gap gets logged in `RISKS.md` as soon as it's found, not silently left implicit. Fixing it
is the same shape of change RISK-018/RISK-021 already made (wrap each handler in
`requireStaffAccess`/`requireAdministratorAccess`, or a patient-identity-scoped check where the
route has a legitimate patient caller) — no new pattern needs inventing, it's applying the existing
one to the routes RISK-018 didn't reach.

**Suggested priority if picked up:** `medical-records`/`prescriptions` first (PHI, highest
severity), then the CMS/config routes, then re-evaluate whether `hr/*` needs a dedicated
`requireAdministratorAccess` call or whether `PROTECTED_API_PREFIXES` should be split into
"authenticated" vs. "staff-only" tiers so middleware can express the difference directly.

**Fixed — 2026-08-16 (commits `5d69a16`, `84de55a`, `f192a3c` → `dev`), first two bullets only:**
- `medical-records` and `prescriptions`: every method (GET/POST/DELETE) now requires
  `requireStaffAccess` — deliberately not `requireAuthenticatedUser`, since a logged-in patient
  satisfies that check and must not read another patient's chart.
- `branches`, `providers`, `terms`, `page-settings`: writes (POST/PATCH/DELETE/PUT as applicable)
  now require `requireAdministratorAccess` (branches/terms/page-settings) or `requireStaffAccess`
  (providers) — GET stays open on all four, since the public site reads them unauthenticated
  (`BookingModal.tsx`, `ContactPageContent.tsx`, `TermsModal.tsx`).
- `categories`, `rooms`, `service-rooms`, `clinic-settings`, `customer-avatars`,
  `provider-attendance`: writes guarded (`requireAdministratorAccess` for categories/
  clinic-settings, `requireStaffAccess` for the rest). `categories` and `clinic-settings` GET also
  guarded with `requireStaffAccess` — confirmed no public consumer calls either.
- Every existing staff/admin caller of a newly-guarded write was located and confirmed to already
  send an `Authorization` header (via `getAuthHeaders()` or the admin panel's
  `authenticatedJsonHeaders`) before this landed — verified by reading each call site, not assumed.

**Still open, not touched by this fix:** `hr/alerts`, `hr/attendance`, `hr/doctor-payroll`,
`hr/leaves`, `hr/payroll`, `hr/performance`, `providers/schedule-audit-logs` (session-authenticated
only, no role check — a patient token still passes) and `translate` (fully open). Title kept as
"partially resolved" until those are picked up.

**Fully resolved — 2026-08-16:**
- Re-audit of the `hr/*` routes found they already use `verifyHrAccess()` (`src/lib/auth.ts`) on all
  admin-facing methods (GET/POST/PATCH/DELETE). This helper validates a bearer token, confirms an
  `employee_accounts` row, and restricts to `superadmin`/`admin`/`hr` roles — stronger than
  `requireStaffAccess`. The self-service methods (attendance POST/PATCH for check-in/out, alerts POST
  for logging own missing state, leaves POST for submitting requests) correctly use token + identity
  verification without requiring admin role — intentional design.
- `providers/schedule-audit-logs`: added `requireStaffAccess` guard. Caller in `admin/page.tsx`
  updated to send `authenticatedJsonHeaders`.
- `translate`: added `requireStaffAccess` guard. All 4 callers in `admin/page.tsx` updated to send
  `authenticatedJsonHeaders`.
- **RISK-036 is now fully resolved.** No PHI, config, or internal route remains accessible without
  a staff-level role check.

---

## RISK-037: AdminBookingsView Buttons Scrolled Away, Table Had Horizontal Overflow, Status Colors Were Ambiguous (RESOLVED)

**Severity:** Low (UX)
**Type:** UI / Usability
**Found:** 2026-08-07

**Description:**
Three usability problems were present in `src/components/admin/bookings/AdminBookingsView.tsx`:

1. **Sticky header not set** — the top action bar (New Booking / Pending / Calendar View / More buttons)
   scrolled out of view as the user scrolled down the appointments table, forcing them to scroll back
   to the top to change view or create a booking.

2. **Horizontal scroll on both tables** — the Pending Approvals table and the Calendar Schedule table
   used `overflow-x-auto` with `whitespace-nowrap` on every cell. On typical admin panel widths the
   tables overflowed the container, hiding the STATUS column behind a horizontal scrollbar.

3. **Status badge colors too similar to distinguish at a glance** — several statuses shared
   visually close hues (orange ≈ orange-50 for Pending, blue-50 for Checked In, purple-50 for In
   Progress, indigo-50 for Postponed — all low-saturation, hard to tell apart quickly).

**Fix applied — 2026-08-07 (commit d3122ca → dev):**
- Top bar changed to `sticky top-0 z-30` with `backdrop-blur-md` frosted background.
- Both tables switched to `table-fixed` with `<colgroup>` percentage widths and `truncate` on all
  text cells — no horizontal scroll needed.
- `getStatusConfig()` updated with fully distinct, vivid per-status colors:
  - Pending → Amber `#F59E0B`
  - Confirmed → Cyan `#06B6D4`
  - Checked In → Sky Blue `#0EA5E9`
  - In Progress → Fuchsia `#D946EF`
  - Completed → Emerald `#10B981`
  - Postponed → Violet `#8B5CF6`
  - Canceled → Rose `#E11D48`
  - No Show → Slate `#64748B`
- Calendar legend dots updated to match the new color palette.

**Files changed:** `src/components/admin/bookings/AdminBookingsView.tsx`

---

## RISK-038: The Doctor's Recalculated Session Total Never Reaches The Database

**Severity:** Critical · **Type:** Data loss / Revenue
**Found:** 2026-08-16, during a full patient-journey audit requested after the clinic owner reported
"Critical workflow logic problems from booking to payment."

**What it is:** Everything a doctor adds during a live session — additional services, products used,
extra device pulses — is computed into an invoice total on screen, and then silently discarded when
the session is completed. Three separate defects stack to produce this:

1. `handleCompleteTreatment` (`src/components/admin/DoctorAccountView.tsx:866-874`) PATCHes
   `{ status, notes, price: updatedInvoiceTotal }`. **`reservations` has no `price` column**, and
   the PATCH handler's field whitelist (`src/app/api/reservations/route.ts:750`) never destructures
   `price` — it accepts `amountPaid`/`amountLeft`. The total is dropped server-side with no error.
2. `additionalServices` is `useState` local to `DoctorOngoingSessionTab.tsx:139` — never lifted to
   the parent, never passed to `handleCompleteTreatment`. The parent's `updatedInvoiceTotal`
   (`DoctorAccountView.tsx:636` = `baseBookingPrice + productsSubtotal + extraPulsesSubtotal`) has
   no knowledge additional services exist at all. So even if (1) were fixed, added services would
   still be missing from the number being sent.
3. Products and pulses *do* write to their own endpoints (`/api/inventory/products/sales`,
   `/api/inventory/devices`), so stock/device counters move — but the reservation's own
   `amount_left`/`service_ids` are never updated to match. Only a free-text summary is appended to
   `notes`.

**Business impact:** After any session where the doctor added anything, the reservation still
carries only the originally-booked single-service price. Reception collects the wrong amount, and
the difference is invisible — it exists only as prose inside `notes`. This is the root cause behind
the "payment shows wrong after session end" symptom, and it compounds RISK-039 below.

**Partially fixed — 2026-08-16:**
- Defect #1: `handleCompleteTreatment` no longer sends `price`. It now sends
  `amountLeft: updatedInvoiceTotal - amountPaid`, which the PATCH handler accepts.
- Defect #2: `additionalServices` state lifted to parent (`DoctorAccountView.tsx:290`).
  `updatedInvoiceTotal` (line 629) now includes `additionalServicesSubtotal`. The correct total
  reaches the server.
- Defect #3 (partial): `amount_left` is correctly updated. `service_ids` on the reservation is
  still not updated when a doctor adds services during the session — a traceability gap, not a
  money-loss gap.

---

## RISK-039: AdminBookingsView Fabricates Payment Status, Doctor Name And Room When Real Data Is Missing (RESOLVED)

**Severity:** Critical · **Type:** Data integrity / Trust
**Found:** 2026-08-16, same audit as RISK-038.

**What it is:** The row-mapping block in `src/components/admin/bookings/AdminBookingsView.tsx`
(~lines 195-239) invents plausible-looking values whenever a field can't be resolved, and renders
them identically to real data — there is no visual distinction:

- **Payment status (line 225):**
  `r.paymentStatus || r.payment_status || (st === "completed" ? "Paid" : idx % 2 === 0 ? "Deposit Paid" : "Unpaid")`
  Neither `paymentStatus` nor `payment_status` exists on a reservation row (no such column — see
  `DB_SCHEMA.md`), so the fallback **always** fires. Every booking with `status === 'completed'` is
  unconditionally labelled **"Paid"**, without ever reading `amount_paid`/`amount_left`. Non-completed
  bookings get "Deposit Paid" or "Unpaid" based on their *array index parity* — pure noise.
- **Doctor name (lines 200-217):** falls back to `allProv[idx % allProv.length]` — a rotating,
  arbitrary *other* doctor — and failing that, the hardcoded literal `"Dr. Sara Ahmed"`.
- **Room (line 219):** falls back to `` `Room ${(idx % 3) + 1}` ``.

**Business impact:** Reception can be shown a booking marked Paid that was never paid, attributed
to a doctor who never treated the patient, in a room it was never assigned to. Because the
fallbacks are index-derived rather than random, they are *stably* wrong — they look consistent
across refreshes, which makes them more convincing, not less.

**Note:** the underlying data is actually correct — `handleCompleteTreatment` sends no `amountPaid`,
so `amount_paid` correctly stays at its real value and the server recomputes `amount_left` properly.
This is purely a display-layer fabrication. Fixing the display is necessary but not sufficient while
RISK-038 keeps the total itself wrong.

**Fixed — 2026-08-16:**
All fabrication logic removed. Payment status now derived solely from real `amountPaid`/`amountLeft`
fields (unknown → `"—"`). Doctor name resolves from multiple real fields then falls back to `"—"`.
Room falls back to `"—"`. No value rendered can originate from an index, modulo, or hardcoded name.

---

## RISK-040: "Cancel & Return" On The Public Deposit Step Orphans The Reservation And Duplicates It On Retry (RESOLVED)

**Severity:** High · **Type:** Data integrity
**Found:** 2026-08-16, same audit.

**What it is:** The public booking flow creates the reservation row at the *end of step 2*
(`handleConfirm`, `src/components/BookingModal.tsx:677-714`) — before the deposit is paid — and then
advances to step 3. The "Cancel & Return" button on step 3
(`src/components/BookingModal.tsx:1663-1674`) does:

```js
onClick={() => { setStep(2); setCreatedReservation(null); }}
```

It clears **browser state only**. The already-created `pending_deposit` row is neither cancelled nor
deleted. If the patient then re-submits step 2, `handleConfirm` fires a fresh `POST /api/reservations`
and a second row is created. Every round trip leaves another orphan.

**Business impact:** Duplicate/phantom bookings accumulate in the pending queue, each consuming
apparent capacity and appearing in Reception's approval list. `customers.number_of_bookings` is also
incremented on each POST (`route.ts:563`), inflating that counter.

**Fixed — 2026-08-16:**
- "Cancel & Return" now PATCHes the existing reservation to `status: 'cancelled'` before clearing
  browser state.
- Re-submitting step 2 reuses `createdReservation.id` via PATCH instead of creating a new row,
  preventing duplicates.

---

## RISK-041: Admin "New Booking" Captures No Payment And Has A Fallback Insert That Cannot Succeed (RESOLVED)

**Severity:** High · **Type:** Revenue / Silent failure
**Found:** 2026-08-16, same audit.

**What it is:** Two defects in `src/components/admin/bookings/AdminNewBookingView.tsx`:

1. **No payment capture (lines 472-487):** the payload sent to `POST /api/reservations` contains no
   `amountPaid`/`amountLeft`. Combined with `isManual: true` — which skips the deposit branch
   entirely (`route.ts:680-684`) — every staff-created booking is written with `amount_paid = 0`
   and `amount_left = full price`. There is no field, checkbox or input anywhere in this form for
   reception to record a deposit or cash payment actually taken at the desk.
2. **Unreachable-success fallback (lines 509-558):** if the API POST fails, a "direct Supabase
   insert fallback" runs using column names that **do not exist** on `reservations` —
   `patient_name`, `customer_name`, `customer_phone`, `start_time`, `time`, `room`, `service_name`
   (and on `customers`: `first_name`, `last_name`, `full_name`, `whatsapp`, `phone`). It cannot
   succeed. Its error is logged but not surfaced (line 556-558), and the handler then unconditionally
   calls `onBookingCreated()` and `onClose()` (lines 570-571) — so the UI reports success and closes
   even when nothing was written at all.

**Business impact:** Money taken at the desk is never recorded against the booking. Separately, a
failed booking can present as a successful one.

**Fixed — 2026-08-16:**
- Dead Supabase fallback removed entirely. The route now returns on `!res.ok` without calling
  `onBookingCreated()` or `onClose()` — failure is surfaced to the user via alert.
- Payment capture added: `amountPaid` and `amountLeft` fields now sent in the payload, populated
  from a payment input in the form.

---

## RISK-042: Wallet And Package Sales Bypass The Customer Balance Fields Entirely (RESOLVED)

**Severity:** High · **Type:** Accounting
**Found:** 2026-08-16, same audit.

**What it is:** Three independent gaps in the customer-level money fields
(`customers.spent_amount` / `outstanding` / `wallet_balance`):

1. **POS wallet payments never deduct the wallet** —
   `src/app/api/inventory/products/sales/route.ts`, `addToCustomerSpend()` (lines 121-149).
   `payment_method: 'wallet'` is accepted and recorded in the `payments` ledger, but nothing
   anywhere subtracts from `customers.wallet_balance`. The same store credit can be spent
   repeatedly, with no upper bound on the drift.
2. **Package sales don't touch any of the three fields** —
   `src/app/api/packages/sell/route.ts:100-177` writes a correct `invoices` + `invoice_lines` +
   `payments` set, but never updates the scalar fields the Patient Profile and Customers list
   actually display. Package revenue — likely the largest per-patient category — is invisible in
   "Total Spent". Additionally `payments.method` is hardcoded `'cash'` (line 171) regardless of the
   real method, corrupting payment-method reporting for every package sale.
3. **`wallet_txns` is never written** — grep across `src/`: read in exactly one place
   (`src/app/api/customers/reconcile/route.ts:33`), inserted nowhere. `src/lib/customerBalances.ts:77-79`
   derives the ledger wallet balance solely from that table, so it is permanently `0`. Since
   `wallet_balance` legitimately becomes non-zero via the cancel-refund path
   (`reservations/route.ts:1021`), the reconcile tool reports a wallet mismatch for essentially every
   customer who ever had a refunded deposit. **The wallet column of `GET /api/customers/reconcile`
   is currently noise, not signal** — it cannot be used to detect real drift.

**Verified sound (not a defect):** `computeSettledBalances()` in `src/lib/billing.ts`, called from
`reservations/route.ts:1178-1235`, is correctly delta-based and idempotent; the cancel→wallet refund,
no-show→spend forfeit, and completion settlement arithmetic all check out. The problem is the two
write paths above that bypass it, not the settlement logic itself.

**Also relevant (intentional, but a third divergence source):** `src/app/admin/page.tsx:6996` lets
staff overwrite `wallet_balance` as an absolute value from the manual edit form.

**Fixed — 2026-08-16/17 (commits `ce4cd2f`, `9221c0f`, `8925cff` → `dev`):**
- New `src/lib/wallet.ts` — `recordWalletMovement()` writes a `wallet_txns` row and updates
  `customers.wallet_balance` together (ledger insert first; if it fails, the scalar is not touched
  and the error surfaces, so the two can no longer silently disagree). `setAbsoluteWalletBalance()`
  handles the one write site that sets an absolute value instead of a delta (the manual admin edit
  noted above), converting it to a signed ledger row and skipping the insert entirely when the
  delta is zero (the `amount > 0` CHECK constraint would otherwise reject it).
- All four real write sites now go through this helper: POS wallet payments (`inventory/products/
  sales/route.ts`, refuses the sale with 409 if the balance is short, instead of silently minting
  credit), the cancel→refund and completion-settlement paths in `reservations/route.ts`, and the
  manual admin edit in `customers/route.ts` (both the update and new-customer-with-opening-balance
  cases).
- `packages/sell/route.ts` now updates `customers.spent_amount` on every sale, accepts a real
  `paymentMethod` on the request (validated against the `payments.method` CHECK list, defaulting to
  `'cash'` for existing callers) instead of hardcoding `'cash'`, and applies the same wallet-balance
  guard/deduction as POS when paid from wallet — with `invoice_id` correctly linked on the ledger row
  since the invoice already exists at that point in this route (POS's deduction happens before its
  invoice is created, so that one's ledger rows have no `invoice_id` — a minor traceability gap, not
  a correctness one).
- `GET /api/customers/reconcile` was not modified — it was already reading the right shape from
  `wallet_txns`; the table was just always empty. It will now compute a correct ledger wallet
  balance for any movement that happened after this fix landed.

**Explicitly not attempted (unchanged from the original finding):** backfilling `wallet_txns` for
historical wallet movements that predate this fix. There is no record of when or why those happened,
so a `wallet_balance` that moved before 2026-08-16 will still show as ledger drift on `reconcile`
until a deliberate opening-balance import is done under DEC-024 — a separate decision, not a bug.

---

## RISK-043: A "Started" Session Has No Timestamp And No Expiry — Sessions Stay Open Indefinitely (RESOLVED)

**Severity:** Medium · **Type:** Data hygiene / Reporting
**Found:** 2026-08-16, same audit. Reported symptom: a doctor was found with an ongoing session
still open from the 10th of the month.

**What it is:** Reception's "Start Session" (`src/app/admin/page.tsx:24259-24279`) PATCHes
`{ status: 'started' }` and nothing else. **No `started_at` column exists** — confirmed absent from
every file in `supabase/migrations/`. This is in direct contrast to `approved_at`, `completed_at`
and `cancelled_at`, which are all set explicitly by the PATCH route (`route.ts:971`, `1097-1098`).

Because no timestamp is recorded, there is no data from which a timeout, staleness warning or
auto-close could be built — not merely "the check is missing", but "the input for any such check
does not exist."

**Business impact:** Sessions abandoned without completion stay `started` forever. They also keep
counting toward "Upcoming" on the dashboard (see RISK-044), and hold a doctor as apparently busy.

**Fixed — 2026-08-16 (data layer):**
- `started_at` is now set to `new Date().toISOString()` on the `started` transition in
  `src/app/api/reservations/route.ts:1108-1110`, guarded so a later money-only PATCH on an
  already-started booking does not reset the clock.
- `mapRow()` returns `startedAt` to callers (line 54).
- Migration: `supabase/migrations/20260816120000_add_started_at_to_reservations.sql`.

**Fixed — 2026-08-16 (surfacing):** the timestamp above was the *input* for a staleness check, but
nothing consumed it — a grep for `started_at` found it only inside `reservations/route.ts` itself, so
the reported symptom (a doctor forgetting a session open) was still live. Now:
- `getSessionStaleness()` + `STALE_SESSION_THRESHOLD_MS` added to `src/lib/services.ts`. Threshold was
  initially a fixed 2 hours by clinic decision, deliberately *not* derived from the service's
  `duration_minutes`: a single number staff can reason about beat per-service accuracy here.
- It only ever reports on `started`/`in_progress` — a completed or cancelled booking is never stale
  regardless of how old its `started_at` is.
- Sessions started before this migration have `started_at = null`. Rather than fabricate an elapsed
  time, those fall back to the booking's own date: still open from an earlier day → stale with
  `elapsedMs = null`, and the UI prints "Left open" instead of a made-up duration.
- `AdminBookingsView`: per-row red badge under the status pill ("Open 3h" / "Open 2d"), plus a
  **Needs Attention** panel above the table listing every stale session across all loaded
  reservations — not just the selected day, since the whole point is to catch days nobody is looking
  at. Each entry opens the booking so staff can complete or cancel it.

**Fixed — 2026-08-16 (configurable threshold + actual duration capture):** two follow-up requests
from the clinic:
- The 2-hour threshold is now **SuperAdmin-configurable** instead of hardcoded: a "Stale Session
  Alert (Hours)" dropdown (1/2/3/4/6/8/12) in Booking Settings
  (`src/app/admin/page.tsx:16067-16090`), persisted via the existing `page-settings`
  save/load path as `booking.staleSessionHours`, and passed to `AdminBookingsView` as the
  `staleSessionThresholdHours` prop. Falls back to the 2-hour default when unset or invalid
  (`AdminBookingsView.tsx:177-180`).
- A reservation now stores how long the session **actually took**, separate from the service's
  planned `duration_minutes`. On the `started` → `completed` transition,
  `src/app/api/reservations/route.ts:1103-1115` computes `completed_at - started_at` in minutes and
  writes it to a new `reservations.actual_duration_minutes` column
  (`supabase/migrations/20260817000000_add_actual_duration_to_reservations.sql`). Only computed when
  `started_at` was actually recorded — no fabricated duration for sessions missing a start time.
  `mapRow()` returns it as `actualDurationMinutes`.

**Deliberately not done:** auto-closing stale sessions. Choosing the terminal state is a business
decision, not a code one — `completed` would run `computeSettledBalances()` and move money on a
session nobody confirmed, and `no_show` forfeits spend; a neutral `abandoned` state would need a
CHECK-constraint migration. Both surfacing paths keep a human on the money decision. `actual_duration_minutes`
is captured but not yet surfaced anywhere in the UI — no display/report consumes it yet.

---

## RISK-044: Dashboard Summary Cards Use Three Different, Mostly Unbounded Time Periods (RESOLVED)

**Severity:** Medium · **Type:** Reporting correctness
**Found:** 2026-08-16, same audit.

**What it is:** In `src/components/admin/bookings/AdminBookingsView.tsx`, `mergedAppointments`
(line 172) is fed by a query with **no date filter at all** (line 142) — every reservation ever
created. `stats` (lines 298-314) then derives four cards from it with inconsistent scoping:

| Card | Line | Actual period |
|---|---|---|
| Today's Appointments | 299, 308 | Single selected day |
| Upcoming | 300, 310 | **All-time, unbounded** |
| Completed | 301, 311 | **All-time, unbounded** |
| Canceled | 302, 312 | **All-time, unbounded** |

Two further defects in the same block:
- **"Upcoming" has no `date >= today` condition** — a forgotten `pending`/`confirmed` booking from
  months ago counts as Upcoming permanently. This compounds RISK-043: a stuck session also never
  leaves this count.
- **"Postponed" is bucketed with cancellations** (line 302:
  `["canceled", "cancelled", "postponed"].includes(...)`). RISK-029 established `postponed` as a
  deliberately distinct, non-terminal state that moves no money and *will still happen*. Counting it
  as cancelled overstates lost bookings and hides genuine reschedule volume.

**Note:** this is the shared Bookings screen, used regardless of role — **not**
`ReceptionDashboardView.tsx` / `GET /api/reception/dashboard`, whose own "Today's Bookings" /
"Pending Approval" widgets (lines 320-350) are correctly day-scoped and are not affected.

**Fixed — 2026-08-16:**
- "Upcoming" now has `date >= todayStr` — past pending/confirmed bookings no longer inflate the count.
- Completed, Canceled, and Postponed are all scoped to `inThisMonth()` (current calendar month).
- "Postponed" is its own separate count, no longer bucketed with cancellations.

---

## RISK-045: Prescription Save Reports Success On Failure; Two Rival Prescription UIs (RESOLVED)

**Severity:** High · **Type:** Silent failure / Clinical record
**Found:** 2026-08-16, same audit.

**What it is:** `src/components/admin/doctor/tabs/DoctorOngoingSessionTab.tsx:230-235`:

```js
if (res.ok) { alert("Prescription saved successfully!"); }
else        { alert("Prescription recorded for session."); }   // failure path
```

A failed `POST /api/prescriptions` produces a success-sounding message. There is no error state
anywhere in the component — the doctor has no way to distinguish a saved prescription from a lost
one.

**Compounding factor:** two independent prescription editors exist with separate state — the inline
writer in `DoctorOngoingSessionTab.tsx` (`rxDiagnosis`/`rxMedications`, lines 146-150) and the
standalone `DoctorPrescriptionModal.tsx` (parent-level state). Filling one does not populate the
other, so it is easy to fill the wrong one and reasonably assume it was saved.

**Adjacent, lower-likelihood (same shape):** `POST /api/medical-records`
(`src/app/api/medical-records/route.ts:171-199`) performs a genuine
`upsert(..., { onConflict: 'customer_id' })` — repeat saves correctly update the same row, so the
"only saves the first time" suspicion is **not** borne out by the code. However, if that upsert
throws, it silently falls back to writing `data/medical_records.json` with no error surfaced, and on
Vercel that file is not durably persisted.

**Fixed — 2026-08-16:**
- Failure path now shows the actual error message from the API (`errData.error || errData.message ||
  "Failed to save prescription. Please try again."`) — no false-success wording.
- Catch block shows explicit connection failure message.

---

## RISK-046: A Failed `checked_in` Write Returns `checked_in` Anyway, Desyncing UI From Database (RESOLVED)

**Severity:** High · **Type:** Silent failure
**Found:** 2026-08-16, same audit.

**What it is:** `src/app/api/reservations/route.ts:1158-1171` — when a PATCH sets
`status: 'checked_in'` and the update is rejected, the fallback writes **`confirmed`** to the
database, then returns `{ ...fbUpdated, status: 'checked_in' }` to the caller. The frontend
(`src/app/admin/page.tsx:24234`) trusts the response and sets local state to `checked_in`. UI and
database disagree until the next hard refetch, at which point the status appears to spontaneously
revert.

The `checked_in` CHECK-constraint migration (`20260810000000_add_checked_in_reservation_status.sql`)
looks correct, so this path may be dormant today — but RISK-020 already documents that migration
application isn't reliably tracked here and that the dev and main databases have diverged, which is
exactly the condition that arms this.

This reintroduces, for check-in specifically, the precise anti-pattern that `route.ts:709-716`'s own
inline comment says must never happen again.

**Fixed — 2026-08-16:**
- Fallback to `confirmed` now returns a `warning` field in the response (not a lie about the status).
  The response `status` field matches the DB reality (`confirmed`), so the client shows the correct
  state. A warning message tells the user the migration may be unapplied.

---

## RISK-047: Approve Request Pre-Fills A Hardcoded Doctor And Discards The Patient's Requested Time (RESOLVED)

**Severity:** High · **Type:** Business logic
**Found:** 2026-08-16, same audit.

**What it is:** `openApprove(r)` (`src/app/admin/page.tsx:7568-7573`) never reads `r.requestedTime` —
the time the patient actually chose, which is populated and used elsewhere (e.g. line 23554). Instead
`refreshApproveAvailability` (lines 7554-7566) does:

```js
const first = filteredSlots.find((s) => !unavailable.includes(s)) || filteredSlots[0] || SLOTS[0];
setSlot(first);
```

— always the **first available slot of the day**, i.e. the clinic's opening time (09:00 by default).
The date is filled correctly from `r.date` (line 7571); only the time is wrong.

Line 7573 additionally does `setDoctorName("Dr. Sara El Gamel")` — a **hardcoded specific doctor**
pre-selected for every approval, regardless of the reservation's own `doctorName` or that doctor's
availability.

**Business impact:** Reception is shown a plausible-looking pre-filled form whose time and doctor
both silently contradict the request. There is no visual cue that these are defaults rather than the
patient's actual booking, so an inattentive approval confirms the wrong slot with the wrong doctor.

**Fixed — 2026-08-16:**
- `openApprove` now reads `r.requestedTime || r.timeSlot` and pre-selects it; if the slot is taken
  or outside hours, it stays selected but a warning is shown.
- `openApprove` now reads `r.doctorName` and pre-fills the doctor field.
- Default `doctorName` state changed from `"Dr. Sara El Gamel"` to `""`.
- Existing `useEffect` validates the doctor against `availableDoctorsApprove` — if the requested
  doctor is unavailable, falls back to the first available, not a hardcoded name.

---

## RISK-048: Pulse Counter Shown For Non-Laser Services; No Out-Of-Stock Indicator On Products (RESOLVED)

**Severity:** Medium · **Type:** UX / Inventory
**Found:** 2026-08-16, same audit.

**What it is:** Two missing-logic gaps in
`src/components/admin/doctor/tabs/DoctorOngoingSessionTab.tsx`:

1. **Pulse counter is ungated.** The "Total Pulses Calculated" badge (lines 613-618) and the
   per-service pulse override input render unconditionally, with no check of service type or linked
   device. Any service added via "Add Additional Service" defaults `pulsesCountForService` to `100`
   (line 142) even when the service has no device associated with it at all.
2. **No stock state on the product picker.** The product `<select>` (lines 764-770) renders
   `{p.name} ({p.price} EGP)` only — it reads no quantity field, disables nothing, and shows no
   "Out of Stock" flag. A doctor can record consumption of a product that has none left, with no
   warning.

**Related, separate defect (same file):** *Primary Reserved Service* does not auto-select the booked
service. Line 634 tries `activeSessionBooking.service_id`, but `mapRow()`
(`src/app/api/reservations/route.ts:22-30`) returns the column as **`serviceId`** (camelCase) — the
snake_case key is never present, so the direct match always misses and the code falls through to
bidirectional `.includes()` string matching against service names, which mismatches whenever the
stored label and current service name differ.

**Fixed — 2026-08-16:**
- Pulse counter default changed to `0` (not `100`) — non-laser services no longer carry a
  fabricated charge.
- Pulse badge is only shown when a device is involved.
- Product picker now shows "Out of Stock" indicator and disables out-of-stock items.
- Service auto-select: the `<select>` value now checks `activeSessionBooking.serviceId` (camelCase,
  as returned by `mapRow()`) first, then falls back to `service_id` and string matching — the
  direct ID match will hit on the first try for all reservations fetched via the API.

---

## RISK-049: `GET /api/reservations` Had No Caller Check At All — Any Patient's Full Booking History Was Readable By Anyone (RESOLVED)

**Severity:** Critical · **Type:** Security / PII exposure
**Found:** 2026-08-17, during a full-system review requested after asking directly "is this ready
to run in a real clinic" — RISK-036's audit (2026-08-03) never examined this route at all, because
its own POST is intentionally public (booking creation) and that appears to have been read as
"the whole route is public" rather than being checked per method.

**What it is:** `GET /api/reservations` ran with zero authentication — `curl` with no token and no
filter returned **every reservation in the database**: name, email, phone, notes, appointment date/
time, doctor, status. Worse, the one legitimate patient-facing caller
(`src/app/profile/page.tsx:99`, the patient's own booking list) called
`?phone=${sessionUser.mobile}` **with no Authorization header**, and the server trusted the query
param verbatim — meaning `GET /api/reservations?phone=<any other patient's number>` returned that
patient's full history to anyone who tried it, logged in or not.

**Fixed — 2026-08-17:**
- Reused the exact staff-vs-patient classification already established for `/api/customers`
  (`classifyCaller()`, exported from `src/app/api/customers/route.ts` rather than duplicated).
  Staff: unrestricted, as before. Unauthenticated: 401. Patient: must supply `phone` or
  `customerId`, and the server verifies it actually resolves to *that* caller's own identity
  (`isOwnIdentity()`, the same normalized-phone/email check `/api/customers` already uses) before
  running the query — a mismatch returns `[]`, not another patient's data. A patient caller with
  neither filter (the shape that used to return everything) gets 403.
- `profile/page.tsx`'s booking-list fetch now sends the `Authorization` header it was missing
  (the page already had an `authHeaders()` helper in scope for its adjacent `/api/customers` call —
  reused, not reinvented).

**Not attempted:** auditing whether any other route has this same "public method assumed to cover
the whole file" gap. This was found by directly re-examining one specific route while answering a
go-live-readiness question, not by a systematic re-sweep of all 69 routes. A full re-audit of GET
methods specifically (POST/PATCH/DELETE were the focus of RISK-036 and RISK-018 before it) has not
been done.

---

## RISK-050: The RISK-040 Public-Booking Fix Was Silently Rejected By A Pre-Existing Auth Gate (RESOLVED)

**Severity:** High · **Type:** Regression / Business logic
**Found:** 2026-08-17, same review as RISK-049.

**What it is:** `PATCH /api/reservations` has required `requireStaffAccess` on every caller since
2026-07-26 (`f29295e`, predates this entire audit), with one narrow unauthenticated carve-out:
`isPatientDepositSelfReport`, which only matches a body shaped like `{status: 'pending', amountPaid,
amountLeft, notes}` on a `pending_deposit` reservation — the patient reporting their own deposit
payment.

RISK-040's fix (2026-08-16, `b3b4b8d`) added two more unauthenticated `BookingModal.tsx` → PATCH
calls that were reviewed and confirmed correct in isolation, but neither was checked against this
gate: "Cancel & Return" sends `{status: 'cancelled'}`, and the reuse-on-retry call sends
`{serviceId, date, requestedTime, name, email, phone, notes, sessionType, branchId, doctorName}` —
**neither shape matches `isPatientDepositSelfReport`**, and neither call sends an Authorization
header (the patient isn't logged in as staff). Both were silently rejected with 401. In practice:
clicking "Cancel & Return" always failed, and re-submitting step 2 after Back always failed —
RISK-040's actual reported bug (orphaned/duplicate reservations) was never fixed, because the fix's
network calls never succeeded in the first place. This was missed in that day's review because the
PATCH body shape was verified correct without also tracing it against `requireStaffAccess`.

**Fixed — 2026-08-17:** extended the same carve-out pattern with two more narrowly-scoped,
`pending_deposit`-only shapes: `isPatientSelfCancel` (`{status: 'cancelled'}` exactly) and
`isPatientSelfUpdate` (the exact field set BookingModal's reuse call sends, no `status` field
present). Both require `target.status === 'pending_deposit'` — once staff have touched a booking
(approved, confirmed, started...) neither shape can match and `requireStaffAccess` takes over
exactly as before. This accepts the same pre-existing risk shape the original deposit-report
carve-out already accepted (an unauthenticated caller who knows a reservation's UUID can act on it
while it's still unpaid) — not a new category of exposure, an extension of one already in production.

---

## RISK-051: Guarding `GET /api/reservations` (RISK-049) Broke The Admin Panel's Own Reads (RESOLVED)

**Severity:** Critical · **Type:** Regression
**Found:** 2026-08-17, live on `dev.reveraclinics.com`, during the manual end-to-end browser session
the RISK-049/050 audit had flagged as still outstanding — a real booking was created and confirmed,
then Patient Booking History and Pending Approvals both showed empty for it.

**What it is:** RISK-049 correctly guarded `GET /api/reservations`. What wasn't checked at the time:
whether the admin panel's *own* reads of that route sent an `Authorization` header. Most did not —
`cachedFetch()` (`src/lib/fetchCache.ts`) had no `headers` parameter at all, since until RISK-049 the
route needed none. The moment it did, `fetchAllReservations`, `fetchRequests` (Pending Approvals),
the schedule-view fetch, and an employee-bookings lookup all started silently returning 401 —
confirmed by reading the actual network response, not inferred from behaviour.

**Fixed:** `cachedFetch` now takes an optional `headers` param; its two reservation call sites in
`admin/page.tsx` pass `authenticatedJsonHeaders`. Two plain `fetch()` call sites with the same gap
(`?createdByEmployeeId=`, `?date=`) fixed the same way.

**Why this matters beyond the fix itself:** RISK-049/050 both went through code review, `tsc`,
`eslint`, a full `npm run build`, and — for RISK-050 specifically — Phase 0's own test suite
proving the guard rejects bad callers correctly. None of that surfaced this, because none of it
exercises a legitimate internal caller's *actual* request against the *actual* running route. Only
opening the real page and reading the real network tab did. This is the concrete case for why
`ai_docs/ADMIN_REFACTOR_AND_I18N_PLAN.md`'s Phase 0 auth tests (TASK-0.4) are necessary but not
sufficient — they test that a route rejects the wrong caller, not that every existing legitimate
caller still succeeds after the route changes. Worth a distinct regression test in Phase 1.

---

## RISK-052: AdminBookingsView's Approve Button Bypassed `openApprove()` Entirely (RESOLVED)

**Severity:** High · **Type:** Regression / Business logic
**Found:** 2026-08-16, live on `dev.reveraclinics.com`, immediately after RISK-051, during the same
manual end-to-end browser session.

**What it is:** the Pending Approvals table's own checkmark button
(`AdminBookingsView` → `onApproveBooking`) called `setSelected(booking)` directly instead of
`openApprove(booking)` — the exact function RISK-047 fixed to pre-fill the approve modal from the
booking's real requested time/doctor and check availability. Bypassing it left the modal's
`slot`/`doctorName` state as whatever a previous modal use had set, which is how a hardcoded
`12:00` and `Dr. Sara El Gamel` reappeared through a second, untouched code path to the same
modal — RISK-047's fix was real, this button just never called it.

**Fixed:** `onApproveBooking` now calls `openApprove(booking)` (`f6ca090`,
[src/app/admin/page.tsx](../src/app/admin/page.tsx)). Documented here retroactively — the fix
shipped same-day but this file wasn't updated until the RISK-053…055 write-up below.

---

## RISK-053: New Cairo Branch's Working Hours Were Never Actually Configured

**Severity:** Low (data/config gap, not a blocking bug) · **Type:** Data integrity
**Found:** 2026-08-16, investigating a live report that 11:30 AM showed as "outside opening hours"
when approving a real test booking (Therapeutic Laser, New Cairo, Tuesday 18 Aug, Dr. saifuldeen
Naser).

**What it is:** there are three independent places branch/service hours can come from, and for New
Cairo none of them hold real data:

1. `branches.service_hours` (New Cairo's row) — `null`, confirmed via `GET /api/branches`. Falls
   back to a hardcoded 09:00–20:00-every-day default baked into `admin/page.tsx` (two separate
   copies of the same default array, lines ~4540 and ~5146).
2. `GET /api/availability`'s own fallback, `page_settings.value.footer.serviceHours` — the live
   `page_settings` row has no `footer` key at all (`booking`/`deposit`/`inactivity`/`departments`
   only, confirmed via `GET /api/page-settings`), so `data?.value?.footer?.serviceHours` evaluates
   to `undefined || []`, i.e. an empty array, which the route then also treats as "no restriction,
   use the 09:00–20:00 hardcoded default."
3. The Settings → Service Hours admin UI writes to (1) — it has just never been saved for this
   branch.

**Why this didn't block 11:30 AM:** every one of these fallbacks is *permissive* (09:00–20:00,
covers Tuesday), not restrictive, so a Tuesday 11:30 AM slot was never actually outside any of the
three computed windows once the involved provider (`saifuldeen Naser`) had a real Tuesday
in-person shift configured for New Cairo (09:00–20:00, confirmed via `GET /api/providers`). The
approve modal's `getDayOperatingHoursApprove` also does not gate the "Confirm approve" button on
its own "outside opening hours" warning — that button is only disabled by
`approveUnavailableSlots.includes(slot) || !slot` (an actual scheduling conflict, not the hours
warning). The specific block seen live most likely reflected the provider's schedule not yet being
saved at that exact moment, or a slot briefly marked "taken" by the since-cancelled duplicate
reservation (`008a9019…`) — both self-resolved, and the booking went on to be approved and started
at the literal requested time (11:30 AM, `saifuldeen Naser`).

**Not fixed — flagged for follow-up:** branch hours should be explicitly configured for every real
branch (New Cairo, Sheikh Zayed) via Settings → Service Hours so the system stops running on
implicit hardcoded defaults, and `fetchCachedServiceHours()` in
[src/app/api/availability/route.ts](../src/app/api/availability/route.ts) silently returning `[]`
for a page-settings shape that no longer exists (`footer.serviceHours`) is itself worth a decision:
either restore that config path or delete the dead fallback.

---

## RISK-054: `AdminBookingsView`'s Display-Only Status Remap Leaked Into The Shared Booking-Details Modal (RESOLVED)

**Severity:** Medium-High · **Type:** Regression / Business logic
**Found:** 2026-08-16, live on `dev.reveraclinics.com`, continuing the same manual session — after
approving and starting the RISK-053 test booking, opening it from Bookings → Today's Schedule
showed no "Treatment In Session" indicator and, worse, still offered Postpone/Cancel/No Show for a
booking that was actively in progress.

**What it is:** `AdminBookingsView.tsx` builds its own table rows with a display-friendly status
(`if (st === "approved") st = "confirmed"; if (st === "started") st = "in_progress";`, line ~227)
and spreads the raw reservation underneath it, so the row object it hands back via
`onViewBookingDetails` carries this *rewritten* status. `admin/page.tsx` passed that object
straight into `setViewingBooking()`, and every Session Flow action in the shared details modal
switches on the **raw** DB status strings (`'approved'`, `'started'`, `'checked_in'`,
`'completed'`). Concretely, for an in-progress booking opened this way:

- `viewingBooking.status === 'started'` never matched (it was `'in_progress'`), so the amber
  "Treatment In Session" banner never rendered — the modal looked like a dead end with nothing left
  to do.
- The "Other Actions" block explicitly excludes `'started'` from showing Postpone/Cancel/No Show
  (`!['completed','cancelled','rejected','no_show','started'].includes(...)`), but since the value
  it saw was already rewritten to `'in_progress'`, that exclusion never fired — reception could
  still see Cancel/No Show/Postpone for a session the assigned doctor was actively running.

Confirmed live: opening the RISK-053 booking (raw status `started`) via Today's Schedule showed a
badge reading `IN_PROGRESS` and an "Other Actions" panel with Postpone/Cancel/No Show still active.

**Fixed:** `onViewBookingDetails` now looks up the untouched record from `allReservations` by id
and passes that to `setViewingBooking` instead of the display-normalised row
([src/app/admin/page.tsx](../src/app/admin/page.tsx), the `AdminBookingsView` render block under
`activeNav === "Bookings"`). `AdminBookingsView`'s own table/badge rendering is unchanged — the fix
only stops its display-only remap from leaking into a component with a different status contract.

---

## RISK-055: Stale Session Token In The Reservations Polling Effect Silently Wiped Pending Approvals & Booking History (RESOLVED)

**Severity:** Critical · **Type:** Regression / Auth
**Found:** 2026-08-16, live on `dev.reveraclinics.com`, same session — Pending Approvals showed "0
bookings awaiting review" and a patient with 2 real bookings showed "No booking history records
found" in their profile, despite both reservations existing and being readable via a direct,
correctly-authenticated fetch.

**What it is:** `admin/page.tsx` has a `useEffect` (`// Re-fetch bookings whenever branch selection
changes and poll every 15 seconds for new requests`) with dependency array `[branch]` and an
`eslint-disable-next-line react-hooks/exhaustive-deps` covering the omission of
`fetchRequests`/`fetchAllReservations`. Those two functions close over `authenticatedJsonHeaders`,
which is rebuilt every render from `session?.access_token` — but because the effect itself only
re-runs when `branch` changes (which happens once, at mount), its `poll()` closure keeps calling
whichever versions of `fetchRequests`/`fetchAllReservations` (and therefore whichever
`session.access_token`) were live the one time this effect fired. If Supabase's session state
updates afterward — a background token refresh, or simply resolving asynchronously after `branch`
was already set — the frozen closure never sees it and keeps sending the old token on every 15-
second poll, indefinitely.

**Confirmed live**, three ways:
1. `read_network_requests` showed a continuous stream of `GET /api/reservations?...branchId=...` →
   `401 {"error":"Invalid or expired session."}`, including immediately after a full page reload.
2. Manually re-issuing the exact same request from the page's own `fetch`, using the access token
   read fresh from `localStorage` at that instant, returned `200` with the real data — proving the
   token in browser storage (and therefore in a freshly-rendered `authenticatedJsonHeaders`) was
   valid; only the frozen closure's copy was stale.
3. `fetchRequests`'s and `fetchAllReservations`'s own `.catch` handlers call
   `setRequests([])`/`setAllReservations([])` on any error — so each failed poll doesn't just skip
   an update, it actively **erases** whatever had loaded successfully before, which is why Pending
   Approvals and every patient's Booking History (both driven by `allReservations`) rendered empty
   instead of merely stale.

**Fixed:** added `session?.access_token` to the effect's dependency array
([src/app/admin/page.tsx](../src/app/admin/page.tsx), ~line 5207) so the poll (and the closures it
captures) is recreated whenever the token value actually changes, not just when `branch` does.

**Why this matters beyond the fix itself:** this is the same failure shape as RISK-051 — a
legitimate, already-authenticated caller silently losing access — but caused by client-side state
going stale rather than a missing header. Neither `tsc`, `eslint`, nor a build would ever catch
this; it only surfaced by reading the actual network tab against the actual running page during a
long-lived manual session, which is exactly the scenario production admin shifts run in for hours
at a time.

---

## RISK-056: Doctor Portal's "Complete Treatment" Silently Dropped The Base Service Price From The Invoice (RESOLVED)

**Severity:** High · **Type:** Regression / Billing
**Found:** 2026-08-17, live on `dev.reveraclinics.com`, continuing the same manual session — after
reassigning the RISK-053 test booking to a doctor with working login credentials and opening its
Ongoing Session screen, the panel read "Primary Reserved Service: 0 EGP" and "Base Service: 0 EGP"
for a Therapeutic Laser booking that costs 110 EGP, before any product/add-on had been logged.

**What it is:** [src/components/admin/DoctorAccountView.tsx](../src/components/admin/DoctorAccountView.tsx)
computed the invoice's base price as:

```js
const baseBookingPrice = Number(
  activeSessionBooking?.price || activeSessionBooking?.total_price || activeSessionBooking?.amount || 0
);
```

`activeSessionBooking` is populated either from `GET /api/reservations` (the `mapRow()` shape —
`serviceId`/`serviceIds`/a nested `services: {price}` object, never a flat `.price`) or from a raw
Supabase realtime row on the `reservations` table (snake_case DB columns, no price column at all —
price is only ever derived via a join to `services`). Neither source has ever set `.price`,
`.total_price`, or `.amount` directly on the booking. Those fields only exist locally after a
doctor manually changes the service via the "Selected Patient Service (Changeable)" dropdown
(`handleChangePrimaryService` sets `price`/`total_price` on the local object as a side effect,
line ~645) — i.e. exactly the one interaction most sessions never need, because the correct
service is already the one that was booked. For every other session, `baseBookingPrice` silently
evaluated to `0`, and since `updatedInvoiceTotal = baseBookingPrice + additionalServicesSubtotal +
productsSubtotal + extraPulsesSubtotal` feeds directly into `amountLeft` on the completing PATCH
(`amountLeft: updatedInvoiceTotal - amountPaid`), **every treatment completed through the doctor
portal without touching that dropdown would invoice for products/add-ons only, with the actual
clinical service silently free.**

Confirmed live: the RISK-053 test booking (Therapeutic Laser, 110 EGP) showed "Base Service: 0
EGP"; after adding one 700 EGP product, "Final Invoice" read 700 EGP, not 810 EGP.

**Fixed:** `baseBookingPrice` now falls back to `activeSessionBooking?.services?.price` (the
mapRow-shaped nested object), then to looking the price up from `servicesList` by the booking's
own `serviceId`/`service_id`/`serviceIds[0]`/`service_ids[0]` — the same `servicesList` source
`handleChangePrimaryService` already trusts — before finally defaulting to `0`. The explicit
`.price`/`.total_price`/`.amount` fields set by actually changing the service are still honoured
first, so that interaction is unaffected.

**Why this matters beyond the fix itself:** this is a real-money billing defect that would have
shipped invisibly — the UI displayed a plausible-looking "0 EGP" that reads as "nothing extra
charged yet" rather than "the entire service is about to be given away for free." It was only
caught because a real doctor login completed a real session with a real product attached and the
arithmetic didn't add up on screen before confirming.

---

## RISK-057: Doctor-Added Products Never Appeared As Invoice Line Items — Regex Format Mismatch (RESOLVED)

**Severity:** Medium-High · **Type:** Regression / Billing display
**Found:** 2026-08-17, live on `dev.reveraclinics.com`, immediately after settling the RISK-056 test
invoice — the printed invoice for a Therapeutic Laser (110 EGP) + 700 EGP product session showed a
single line item ("Therapeutic Laser — EGP 110"), a Subtotal of EGP 110, and "Amount Paid: EGP
810" directly beneath it, with nothing on the document explaining the 700 EGP gap. The reception
booking-details drawer's "Products & Session Consumables" panel showed "No products added" for the
same booking, despite `amountPaid`/`amountLeft` already being correct (RISK-056).

**What it is:** neither surface stores doctor-added products as structured rows — both
reconstruct them by regex-parsing the reservation's free-text `notes` field (the same
`notes`-as-source-of-truth pattern RISK-038 already flagged as a traceability gap). Both parsers
recognize three note formats: `- Name (xQty) @ Price EGP`, `[Added Product]: Name (xQty) - Total
EGP`, and `[Extra Device Pulses]: ...`. **None of them match what `DoctorAccountView.tsx`'s
`handleCompleteTreatment`/`handleSaveClinicalNote` actually write**:
`[Products Used During Session]: Name (Qty: N x UnitPrice EGP = Total EGP)`. Since the doctor
portal is the only place a product gets added *during* a session (as opposed to reception adding
one before/after), every session-added product silently failed to reconstruct on both the
invoice PDF and the drawer's product panel — the money was always correct (RISK-056), only the
itemized paper trail was invisible.

**Fixed:** added a fourth regex,
`/(\S[^,\n]*?)\s+\(Qty:\s*(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*EGP\s*=\s*(\d+(?:\.\d+)?)\s*EGP\)/g`,
matching `[Products Used During Session]: ...` in both places it's parsed:
[src/app/admin/page.tsx](../src/app/admin/page.tsx) — the `viewingBooking` drawer's
`drawerAttachedList` (~line 23601) and the `invoiceBooking` PDF's `invoiceAttachedList`
(~line 27411). No data migration needed — this reconstructs from `notes` on every render, so it
retroactively fixes every already-completed booking with this note shape, not just new ones.

**Not fixed — flagged for follow-up:** this is the same underlying gap RISK-038 already named
partial: reconciling four independent regex-based reconstructions of `notes` (here, the drawer, the
invoice, and the checkout modal's own `extraAddonsCost` derivation) instead of writing doctor-added
products as real rows the moment they're added is fragile — the next new note format written
anywhere will silently reproduce this exact bug. Worth a real `reservation_products` (or similar)
table before the next billing feature touches this path.

---

## PROPOSALS.md Reference

See `PROPOSALS.md` for:
- **PROPOSAL-001** — extract all Revera-specific values into a single `client.config.ts`,
  making fork-per-client a one-file-edit operation.
- **PROPOSAL-002** — the Finance & Management Accounting module. Its Phase 0 is the remediation
  plan for RISK-010 … RISK-015 and RISK-018.
