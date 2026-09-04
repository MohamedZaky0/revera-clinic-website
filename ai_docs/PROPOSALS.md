# PROPOSALS.md — Proposed Refactors

> **Status:** PROPOSED — review before executing. Do not implement without explicit approval.

---

## PROPOSAL-001: Centralize Client-Specific Config for Fork-per-Client

**Problem:**
Forking this repo for client #2 currently requires finding and replacing Revera-specific values
scattered across 20+ files. This is error-prone and slow. See `RISKS.md` → RISK-001 for the
full audit of every hardcoded location.

**Goal:**
"Copy repo, edit one file, point at new Supabase project" — that's the entire fork setup.

**Do NOT execute this refactor without review. This is a plan only.**

---

### What Would Move: `src/config/client.ts` (new file)

```ts
// src/config/client.ts
// Edit this file when forking for a new client.

export const CLIENT = {
  name: "Revera Clinics",
  nameShort: "Revera",

  // Used in page <head> metadata
  tagline: "Medical Center",
  metaDescription: "Expert dermatology and cosmetic surgery services...",

  // Contact
  phoneDisplay: "(+20) 01035595691",
  phoneTel: "+201035595691",
  whatsappNumber: "201035595691",
  whatsappGreeting: "Hello Revera, I'd love to schedule a consultation at your New Cairo branch. Please let me know your earliest availability. Thank you.",
  whatsappBookingGreeting: (serviceName: string) =>
    `Hello Revera, I'm interested in booking "${serviceName}". Please let me know your availability at your New Cairo branch. Thank you.`,

  // Brand assets
  logoPath: "/images/main_logo.png",
  faviconPath: "/icon.png",

  // Supabase — these stay in env vars (already clean, no change needed)
  // NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

  // localStorage key prefix (prevents collision if same browser hits multiple forks)
  storagePrefix: "revera",
} as const;
```

---

### What Moves to `globals.css` (already partially done — gap to close)

Brand colors are already defined as CSS custom properties in `globals.css`. The remaining
work is to remove all inline raw hex values from components and replace with CSS var references:

| Raw hex in component | Replace with |
|---|---|
| `#414E36` (Tailwind JIT `bg-[#414E36]`, `text-[#414E36]`) | `bg-[var(--cr-primary)]` or `text-[var(--cr-primary)]` |
| `#C4AE7C` (Tailwind JIT `bg-[#C4AE7C]`) | `bg-[var(--cr-accent)]` |
| Inline `style={{ color: "#414E36" }}` | `style={{ color: "var(--cr-primary)" }}` |

Files to update (from audit):
- `src/components/AboutSection.tsx` (lines 146, 176, 181, 239, 250)
- `src/components/AboutPageIntro.tsx` (lines 257, 373, 383)
- `src/components/BookingModal.tsx` (lines 637, 648)
- `src/app/admin/page.tsx` (lines 104–107 and throughout)

After this change, a client with different brand colors only needs to edit the CSS custom
properties block in `globals.css`.

---

### What Stays in `translations.ts` (by design)

All UI copy strings (clinic description, hero text, testimonials, FAQs, service descriptions)
live in `translations.ts`. This is correct — they are content, not config. When forking:
- Replace all occurrences of "Revera" within translation strings
- Update service category names to match the new client's specialties
- Update the clinic description paragraphs

This is expected work per fork, but it's contained in one file.

---

### What Gets Updated in `src/lib/serviceStore.ts`

The three localStorage keys are prefixed with `revera_`:
```ts
const TOGGLES_KEY = "revera_service_toggles";
const SERVICES_KEY = "revera_dynamic_services";
const CATEGORIES_KEY = "revera_dynamic_categories";
```

After PROPOSAL-001, these would be derived from `CLIENT.storagePrefix`:
```ts
const TOGGLES_KEY = `${CLIENT.storagePrefix}_service_toggles`;
```

---

### Page `<head>` Metadata

Each page file hardcodes its own `export const metadata`. After PROPOSAL-001, these would
import from `CLIENT`:

```ts
// Before (src/app/layout.tsx:21)
title: "Revera Clinics - Medical Center"

// After
title: `${CLIENT.name} - ${CLIENT.tagline}`
```

Affected files:
- `src/app/layout.tsx`
- `src/app/services/page.tsx`
- `src/app/contact/page.tsx`
- `src/app/blog/page.tsx`
- `src/app/about/page.tsx`

---

### WhatsApp Links in Components

All `wa.me` links and message strings reference the phone number and clinic name inline.
After PROPOSAL-001, they would read from `CLIENT`:

```ts
// Before
window.open(`https://wa.me/201035595691?text=${msg}`, '_blank');

// After
window.open(`https://wa.me/${CLIENT.whatsappNumber}?text=${msg}`, '_blank');
```

Affected files: `ServicesSection.tsx`, `HomeServicesSection.tsx`, `HeroSlider.tsx`, `Navbar.tsx`

---

### Summary: Files to Touch in This Refactor

| File | Change |
|---|---|
| `src/config/client.ts` | **Create new** — all client-specific values |
| `src/app/globals.css` | No structural change — brand colors already here |
| `src/app/layout.tsx` | Import CLIENT for metadata |
| `src/app/*/page.tsx` (5 files) | Import CLIENT for page metadata |
| `src/components/Navbar.tsx` | Import CLIENT for phone, WhatsApp links, logo path |
| `src/components/HeroSlider.tsx` | Import CLIENT for WhatsApp link |
| `src/components/ServicesSection.tsx` | Import CLIENT for WhatsApp links |
| `src/components/HomeServicesSection.tsx` | Import CLIENT for WhatsApp links |
| `src/components/SiteFooter.tsx` | Import CLIENT for phone |
| `src/components/AuthModal.tsx` | Import CLIENT for logo path |
| `src/components/BookingModal.tsx` | Import CLIENT for logo path |
| `src/components/AboutSection.tsx` | Import CLIENT for logo path; fix inline hex colors |
| `src/components/AboutPageIntro.tsx` | Fix inline hex colors |
| `src/lib/serviceStore.ts` | Import CLIENT for storage key prefix |
| `src/app/admin/page.tsx` | Fix inline hex colors; import CLIENT for phone fallbacks |

**Not included in this refactor:**
- `translations.ts` copy strings (expected per-fork manual edit)
- Service category content in `services.ts` (expected per-fork manual edit)
- Images in `public/images/` (replaced by dropping new assets into the fork)

---

### Result After This Refactor

Forking for client #2:
1. `cp -r revera-website-frontend client2-website-frontend`
2. Edit `src/config/client.ts` — update name, phone, WhatsApp, logo path
3. Edit `src/app/globals.css` — update the 2 hex values in the `:root` block
4. Edit `src/lib/translations.ts` — replace clinic name and copy (one file)
5. Edit `src/lib/services.ts` — replace service categories (one file)
6. Drop new logo into `public/images/`
7. Point `.env.local` at new Supabase project
8. Deploy

---

## PROPOSAL-002: Finance & Management Accounting Module

> **Status:** PROPOSED — plan approved in discussion 2026-07-25, not yet executed.
> **Audited from:** 6-agent parallel codebase discovery, 2026-07-25. Every claim below is
> cited to `file:line`. Findings that contradict `ai_docs/` are called out explicitly.

### Goal

A Finance section that lets a **non-accountant clinic owner** see and understand every
pound the clinic earns and spends: true profit per session, monthly P&L, depreciation
(الإهلاك), debt, capacity ceiling, and the optimal service mix. Generic enough to work
for any clinic, not just Revera.

### Headline finding: the current money layer cannot support this

Every financial number in the schema is a **mutable column on a mutable row**. There is no
append-only structure anywhere. Before any analytics is meaningful, six defects must be fixed —
see RISK-010 … RISK-015. The most severe: **no reservation ever stores the price it charged**,
so historical invoice totals silently change whenever the service catalog is edited
(`src/app/admin/page.tsx:26997`, `src/lib/printUtils.ts:21`).

### Decisions taken (logged as DEC-014 … DEC-024)

| # | Decision |
|---|---|
| Materials | Standard recipe (BOM) per service, auto-deducted at completion, **editable** by staff at that moment |
| Assets | Dedicated per-branch **asset register**; `inventory_devices` links into it |
| Commission | Per-doctor configurable: fixed / percentage / both, with an explicit commission **base** |
| Depth | Management accounting in clinic language — **no** chart of accounts, no journal entries, no double entry |
| Sequencing | Repair the foundation first; do not build reporting on broken inputs |
| Overheads | Two-level: contribution margin (primary, unallocated) + fully-loaded cost (secondary, allocated by room-minutes) |
| History | **No backfill** — all existing data is mock (DEC-026, supersedes DEC-020). Real data starts at go-live |
| Labour | Staff salaries stay fixed overhead; only doctor commission is per-session |
| Tax | Prices stored **tax-inclusive** with a `tax_rate` on the line so a split stays derivable; products carry a **role** flag (retail / consumable / both) |
| Permissions | `finance.*` granted to `admin` by default but **revocable** from Role Permission settings — finance checks short-circuit on `superadmin` only |
| Packages | First-class, with **deferred revenue** recognised per session delivered |
| Opening balances | One generic import, **bidirectional** (clinic owes patient / patient owes clinic), written into the normal ledgers with an `is_opening` flag |

---

### Phase 0 — Verify & repair (blocking, no finance code yet)

| # | Task | Reference |
|---|---|---|
| 0.0 | **Fix the migration pipeline first (RISK-020).** The migrations folder describes no live database, and dev/main have diverged. Snapshot the live dev schema, consolidate the 30 files into one clean baseline (cheap now — production is not live), adopt the Supabase CLI for state tracking, and remove the silent-fallback insert chain at `reservations/route.ts:274-305` that hides schema errors | RISK-020 |
| 0.1 | **Verify live DB against migrations.** `product_sales` above all — the insert payload and the table definition disagree | `src/app/api/inventory/products/sales/route.ts:101-115` vs `supabase/migrations/20260720164008_setup_inventory_schema.sql:21-38` |
| 0.2 | Fix branch pricing — server: `Number(branchId)` on a UUID → NaN, and `select('name')` on a table with only `name_en`/`name_ar` | `src/app/api/reservations/route.ts:198-206` |
| 0.3 | Fix branch pricing — client: a UUID is a non-numeric string, so the UUID is used as the branch *name* | `src/lib/services.ts:137-147` |
| 0.4 | Fix double stock deduction: POS deducts in both `/sales` and `/customers/products` | `.../sales/route.ts:124` + `customers/products/route.ts:189` |
| 0.5 | Fix `customers.outstanding` never decrementing | `src/app/api/reservations/route.ts:580` |
| 0.6 | Fix sales-history fallback: empty array is truthy, so the fallback is unreachable | `.../sales/route.ts:32-37` |
| 0.7 | Add `reservations.provider_id` FK; backfill from `doctor_name`; keep the text column as a denormalized snapshot | `full_migration.sql:228` |
| 0.8 | Add `services.duration_minutes` numeric; backfill from the free-text `duration` | `src/lib/services.ts:1-34` |
| 0.9 | Correct `ai_docs` drift — see "Doc corrections" below | hard rule 6 |
| 0.10 | Protect `/api/reservations` PATCH and `/api/inventory/products/sales` — both mutate money and are unauthenticated | `src/middleware.ts:5` |

**Doc corrections required (all currently false):**
- `DB_SCHEMA.md:177` + `PRODUCT_RULES.md:18-28` — the "max 8 approved bookings per service/day/branch"
  cap **does not exist**. The PATCH approve block (`reservations/route.ts:345-523`) has no count check.
  The only `8` is client-side dead code (`BookingModal.tsx:1066`, fed by a map that only ever holds 0 or 99).
- `DB_SCHEMA.md:176` — the time-slot uniqueness constraint was **deliberately dropped**
  (`20260705141243_setup_rooms_schema.sql:104-105`).
- `DB_SCHEMA.md:159,161` — `reservations.origin` and `reservations.cancelled_reason` are created by
  **no migration**. `20260709154350_add_reservation_source.sql` adds `is_manual`, despite its filename.
- `DB_SCHEMA.md:743` — "most tables have RLS disabled" is **stale**;
  `20260722140000_enable_row_level_security.sql:11` enables RLS on all 28 tables, and 15 of them
  have **zero policies** (service-role-only).
- `CLAUDE.md` rule 3 + `ARCHITECTURE.md:16` — "`/api/*` is not auth-validated server-side" is stale;
  `src/middleware.ts:5` protects 4 prefixes. The rule is still *directionally* right for the money routes.

---

### Phase 1 — Financial ledger spine

The core structural change. Money stops being a scalar and becomes an event.

```
invoices           id, invoice_no (sequence), reservation_id?, customer_id, branch_id,
                   issued_at, subtotal, discount_total, grand_total (tax-inclusive),
                   status, is_opening
invoice_lines      invoice_id, line_type ('service'|'product'|'package'), service_id?,
                   product_id?, package_id?, description, qty, unit_price, discount,
                   line_total, tax_rate, cogs_snapshot, commission_snapshot, provider_id
payments           invoice_id, received_at, amount, method ('cash'|'card'|'wallet'|'instapay'|'transfer'),
                   received_by_employee_id, reference, is_opening
wallet_txns        customer_id, occurred_at, direction ('in'|'out'), amount, reason,
                   invoice_id?, is_opening
```

**Packages and deferred revenue (DEC-023)** — the clinic sells prepaid multi-session packages and
this is core to the business, so it cannot be deferred to a later phase:

```
packages                 id, name, branch_id?, price (tax-inclusive), tax_rate, validity_days, active
package_items            package_id, service_id, qty
customer_packages        id, customer_id, package_id, invoice_id, purchased_at, expires_at,
                         price_paid, status, is_opening
customer_package_items   customer_package_id, service_id, qty_total, qty_used, qty_remaining
```

Selling a package books **cash received** but **not revenue**. Revenue is recognised per session:
```
recognised per session = price_paid / total_sessions_in_package
deferred balance       = Σ price_paid × qty_remaining / qty_total     ← a liability
```
Without this, a month with heavy package sales looks far more profitable than it was, and the months
that actually deliver those sessions look like losses.

**Opening balances (DEC-024)** — one import at clinic setup, writing into these same ledgers with
`is_opening = true` and a shared `as_of` date, so no downstream report needs to special-case it.
Bidirectional: patient receivables, patient wallet credit, undelivered package sessions, supplier
payables, cash/bank, inventory at cost, assets with accumulated depreciation, loans at remaining
balance. **Receivables must come from a physical audit, not from `customers.outstanding`** — that
column is inflated by RISK-012 and must not be baked in as verified opening data.

- `customers.outstanding` / `spent_amount` / `wallet_balance` become **derived** from the ledger,
  with a reconciliation job. This alone fixes the never-decrementing debt bug permanently.
- Price, discount, COGS and commission are **snapshotted at issue time** — reprinting an old
  invoice can never change its total again.
- **No backfill (DEC-026).** All existing data is mock, so there is no history worth reconstructing.
  The only import built is the opening-balance one (DEC-024), which is a different thing: a real
  clinic's day-one balances, not its transaction history.

**Still open:** package expiry policy — if an unused session expires, is the remaining deferred
balance then recognised as revenue, or refunded/extended?

---

### Phase 2 — Cost of delivery

```
service_consumables   service_id, product_id, standard_qty        ← the recipe (BOM)
consumption_entries   reservation_id, product_id, qty, unit_cost_snapshot, was_edited
stock_movements       product_id, occurred_at, direction, qty, unit_cost, reason, ref_id
suppliers             name, contact, payment_terms
purchases             supplier_id, purchased_at, total (tax-inclusive), paid, due_date
purchase_lines        purchase_id, product_id, qty, unit_cost (tax-inclusive)
```

**Products have two roles (DEC-021).** `inventory_products` gains `role` ∈
`retail` | `consumable` | `both`. The same item can be **sold** to a patient (revenue, via
`product_sales` → `invoice_lines`) and **consumed** inside a service (cost, via
`service_consumables` → `consumption_entries`). One gross tax-inclusive price serves both roles;
purchase costs are likewise recorded gross, so recorded cost is what the clinic actually paid.

- Stock stops being mutated in place; `stock_quantity` becomes the sum of movements.
  This gives weighted-average cost, shrinkage reconciliation, and an audit trail.
- Device pulses get a money value: `cost_per_pulse = lamp_replacement_cost / rated_pulses`,
  consumed per session and snapshotted onto the invoice line.
- Doctor commission is computed and **stored per line** — not re-derived monthly from a
  fragile name-string match (`hr/doctor-payroll/route.ts:172`).

---

### Phase 3 — Overheads, assets, liabilities

```
expense_categories   name, kind ('fixed'|'variable'), parent_id
expenses             category_id, branch_id, incurred_on, amount, vendor, note, recurring_id?
recurring_expenses   category_id, branch_id, amount, cadence, next_due_on, active
fixed_assets         branch_id, category, name, purchased_on, cost, useful_life_months,
                     salvage_value, status, device_id?   ← links inventory_devices
depreciation_entries asset_id, period (YYYY-MM), amount, book_value_after
loans                lender, principal, annual_rate, term_months, started_on, installment
loan_schedule        loan_id, period, installment, interest_part, principal_part, balance_after
```

Straight-line depreciation: `(cost − salvage) / useful_life_months`, posted monthly.
Loan installments split into interest (P&L expense) and principal (balance reduction).

---

### Phase 4 — Reporting engine + UI

- **New `/api/finance/*` routes doing SQL-side aggregation.** Today every number in the admin
  panel is a client-side `.reduce()` inside a 27,551-line file — that will not scale to finance.
- **Charting is from zero.** No library is installed; the one existing "chart" is 40 lines of
  literal SVG `<rect>` with baked-in pixel coordinates (`admin/page.tsx:21827-21863`).
- **Permissions (DEC-022):** add `finance.*` to `PERMISSION_STRUCTURE`, seed the `admin` role with it
  by default, and have finance checks short-circuit on `superadmin` **only** — so it stays revocable
  from Role Permission settings. Today `hasStaffPermission` (`src/lib/access.ts:55`) short-circuits
  true for **any** `admin` role, which would make Finance grantable but never revocable. The
  practical risk: a branch manager given the `admin` role would silently see every salary and margin.
- **Wiring a new section touches 4 places** that are easy to leave out of sync:
  `PERMISSION_STRUCTURE`, `hasPermission`'s `parentScreenMap` (`:681-687`),
  `permittedSidebarItems`' map (`:706-714`), and the redirect effect's map (`:2098-2104`).
  The existing Rooms entry already has this bug (gated on a permission that does not exist, `:7262`).
- **Delete the ~4,000 lines of dead mock finance JSX** rather than reviving it. It is unreachable
  (no `setActiveNav` path leads to it), its values are pre-formatted strings, and the
  Finance→Payroll screen is entirely fake while the real payroll lives under HR.

Reports: monthly P&L, cash flow, per-service margin, per-doctor P&L, per-branch P&L,
budget vs actual, patient receivables aging.

---

### Phase 5 — Capacity & optimization

**Theoretical capacity, per branch per day:**
```
room_minutes    = Σ (clinical rooms, status='available') × branch open minutes
doctor_minutes  = Σ over scheduled providers of Σ shifts[].(end − start)
bottleneck      = min(room_minutes, doctor_minutes)
```
Requires fixing two things first: provider `shifts[]` are currently collapsed to a single
start..end window (`availability/route.ts:311`), overstating split-shift doctors; and a
holiday/leave calendar does not exist.

**Utilization:** `booked_minutes / bottleneck_minutes`, where booked minutes come from
`duration_minutes` per reservation. Needs a `no_show` status and status-transition timestamps
(`approved_at`, `completed_at`, `cancelled_at`) — none exist today.

**Break-even:**
```
fixed_monthly       = opex + depreciation + fixed salaries + loan interest
break_even_revenue  = fixed_monthly / weighted_avg_contribution_margin_ratio
```

**Optimal service mix — contribution margin per bottleneck minute:**
```
CM_per_minute(s) = (price − materials − commission − pulse_cost) / duration_minutes(s)
```
Rank services descending by `CM_per_minute`, then allocate available bottleneck minutes greedily,
each service capped by realistic monthly demand. Greedy allocation is provably optimal for this
problem shape (fractional knapsack). **This is the key insight:** a 60%-margin service that
occupies the only laser room for two hours is worse than a 40%-margin service that takes twenty
minutes. Ranking by margin percentage alone produces the wrong answer.

**Max potential revenue** = Σ over the optimal allocation of `sessions_i × price_i`.
**Gap to potential** = potential − actual, decomposed into idle capacity, suboptimal mix, and
no-shows/cancellations.

**Committed capacity must be netted out (DEC-023).** Undelivered package sessions are already-sold
future chair time. Sellable capacity is therefore:
```
sellable = bottleneck_minutes − Σ (undelivered package sessions × duration_minutes)
```
Treating all capacity as available would overstate potential revenue and double-count money the
clinic has already collected.

---

### Data a clinic must supply at setup (reusable across clinics)

**Configuration**
1. Asset register — category, purchase date, cost, useful life, salvage value, **accumulated
   depreciation to date** for assets already in service
2. Fixed monthly expenses per branch — rent, utilities, internet, cleaning, security, software, licenses
3. Loans — **remaining** balance (not original principal), rate, remaining term, installment
4. Consumable recipe per service, and each product's role (retail / consumable / both)
5. Cost per pulse per device (lamp or handpiece cost ÷ rated pulses)
6. Each doctor's contract — fixed / percentage / both, and the commission base
7. Service duration in **minutes** (numeric, not free text)
8. Package definitions — contents, price, validity

**Opening balances — bidirectional (DEC-024)**
9. Cash and bank balances
10. Inventory on hand **at cost** (physical count)
11. Patient receivables — **from a physical audit**, never migrated from `customers.outstanding`
    (inflated, RISK-012)
12. Patient wallet credit balances — a liability, this is the patients' money
13. Undelivered package sessions per patient — deferred revenue, also a liability
14. Supplier payables
15. Prepaid expenses (rent or insurance paid in advance) and accrued expenses (salaries and
    utilities incurred but unpaid)
16. Owner drawings and capital injections — without these, cash will never reconcile

**Optional but high value**
17. Last 12 months' revenue, even approximate — gives a seasonality baseline on day one
18. Marketing spend per channel — `customers.referral` **already exists** in the schema, so
    customer acquisition cost and marketing ROI come almost free once spend is recorded
19. Monthly budget per expense category — makes budget-vs-actual work immediately

### Data the system must start capturing

9. Payment method per transaction · 10. Date of each receipt, not just a running total ·
11. `no_show` status · 12. Status-transition timestamps · 13. `provider_id` FK instead of a name string ·
14. Discount as a separate line · 15. COGS snapshot at time of sale · 16. Stock movements as a ledger ·
17. Purchases — supplier, qty, cost, date · 18. **Refused demand** — patients who found no free slot
and left. This leaves no trace today and is the single most important input for a
capacity-expansion ROI case.
