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
(re-verified against dev — see `FINANCE_PHASE_1_MANUAL_TESTS.md` task 1.11 evidence).

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

## PROPOSALS.md Reference

See `PROPOSALS.md` for:
- **PROPOSAL-001** — extract all Revera-specific values into a single `client.config.ts`,
  making fork-per-client a one-file-edit operation.
- **PROPOSAL-002** — the Finance & Management Accounting module. Its Phase 0 is the remediation
  plan for RISK-010 … RISK-015 and RISK-018.
