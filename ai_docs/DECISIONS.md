# DECISIONS.md — Revera Clinics Decision Log

> **Last Updated:** 2026-09-06 (DEC-051)
> **Previous content was for a different project — discarded entirely**
> **Rule:** Before changing any decision recorded here, read the full entry first.

---

## DEC-001: Fork-per-Client Rather Than Multi-Tenant SaaS

**Date:** 2026-06-26
**Status:** Decided — active

**Context:**
Revera Clinics is the first client of this clinic management + public website system. The
business plans to offer the same system to other clinics (client #2, #3, etc.). A decision
was needed on the deployment model for multiple clients.

**Alternatives Considered:**
- Shared multi-tenant SaaS (one codebase, one database, org/tenant isolation via DB schema)
- Fork-per-client (duplicate the repo + Supabase project per client, edit theme/branding)

**Chosen Option:** Fork-per-client

**Reason:**
- Beta phase with 2–3 clients only — full SaaS architecture is premature
- Each client has different branding, colors, copy, and service catalogs
- Isolating client data via separate Supabase projects is simpler and more secure at this scale
- Avoids the engineering overhead of multi-tenant data isolation, RLS complexity, and tenant-aware queries
- Any bugs in one client's deployment don't affect others

**Trade-offs:**
- Code fixes and improvements must be manually propagated to each fork
- As client count grows, this becomes increasingly expensive to maintain
- No shared infrastructure means no economies of scale on hosting/DB costs

**Reconsider When:**
Approximately 10 clients. At that point, the cost of maintaining N forks likely exceeds
the cost of building a proper multi-tenant architecture. The SaaS conversion decision
should be re-evaluated at the 8–10 client mark.

**Impact on Codebase:**
This decision requires that all Revera-specific values (brand colors, clinic name, phone
numbers, WhatsApp messages, service categories) be extractable to a single config point.
Currently they are scattered. See `RISKS.md` → RISK-001 and `PROPOSALS.md`.

---

## DEC-002: Single Next.js App for Both Public Website and Admin Panel

**Date:** Pre-2026-06-26 (inferred from code)
**Status:** Decided — active

**Context:**
The system combines a public marketing website (patient-facing) and an admin CRM panel
into a single Next.js application.

**Chosen Option:** Single app — admin at `/admin`, public site at `/`, `/about`, `/services`, etc.

**Reason:**
- Simpler deployment (one Vercel project, one domain)
- Shared types, lib utilities, and Supabase clients
- Appropriate for a small team and small client count

**Trade-offs:**
- Admin panel JavaScript is bundled into the same Vercel deployment as the public site
- No separation of concerns between admin and public site (e.g., separate deployments, auth domains)
- Admin panel is currently unprotected — anyone who knows the URL can access it

**Reconsider if:**
Admin panel requires a different auth system, different domain, or needs to be separated
for compliance or security reasons.

---

## DEC-003: Supabase Service Role Key Used Server-Side for All API Routes

**Date:** Pre-2026-06-26 (inferred from code)
**Status:** Decided — active

**Context:**
All Next.js API routes use the Supabase service role key (bypasses RLS) rather than
user JWT tokens.

**Reason:**
- Admin panel has no user auth — no JWT to use
- Simplifies server-side queries (no RLS policy design needed)
- Acceptable for current threat model (single-tenant, internal tool)

**Trade-offs:**
- No row-level security enforcement — any server-side code can read/write any row
- If API routes are ever exposed to untrusted callers, this becomes a serious vulnerability
- Cannot implement user-specific data access control without changing this

**Reconsider if:**
Patient auth is wired to real authentication and patient-specific data access is needed.

---

## DEC-004: Persistent Customer Database Table and Wallet Ledgers

**Date:** 2026-07-06
**Status:** Decided — active

**Context:**
Originally, patient details were captured on a per-reservation basis only. We decided to create a persistent `customers` table to track unified histories, financial stats (wallet balance, spent amount, outstanding balance), and support customer wallet checkout/settlement flows.

**Reason:**
- Tracks patient value and debt across bookings.
- Enables patients to pay using saved wallet credits.
- Replaces mock financial pages with real data.

---

## DEC-005: Branch-Specific Service Hours

**Date:** 2026-07-07
**Status:** Decided — active

**Context:**
Branches initially shared a single hardcoded schedule. We decided to parameterize hours by introducing a `service_hours` JSONB column on the `branches` table.

**Reason:**
- Permits different branches (e.g. Sheikh Zayed, New Cairo) to operate on distinct weekly calendars.
- Integrates branch-specific hours directly into public booking calendars and admin validation engines.

---

## DEC-006: Inline Drawer Notes Editing

**Date:** 2026-07-08
**Status:** Decided — active

**Context:**
Admin notes were previously updated via browser-default `window.prompt()` popup boxes. We decided to replace this with an inline textarea editor directly inside the booking details drawer.

**Reason:**
- Provides a clean, modern, and unified admin aesthetic.
- Prevents jarring native browser dialog interruptions.

---

## DEC-007: Expanded Booking Lifecycle Stages

**Date:** 2026-07-06
**Status:** Decided — active

**Context:**
Reservations previously had only `pending`, `approved`, and `rejected`. The clinic needed a fuller flow to track a patient through arrival, service, and payment.

**Chosen Option:**
Add statuses `confirmed`, `started`, `completed`, and `cancelled`.

**Reason:**
- Matches real-world clinic workflow.
- Allows payment settlement only when status reaches `completed`.

---

## DEC-008: Client-Side PDF Invoice Printing

**Date:** 2026-07-09
**Status:** Decided — active

**Context:**
The admin panel needs to print booking invoices/receipts for patients.

**Chosen Option:**
Generate the invoice DOM inside the admin page and trigger browser `window.print()` on a styled section.

**Reason:**
- No server-side PDF library needed.
- Quick to implement and style with existing Tailwind classes.

**Trade-offs:**
- Print output varies by browser/OS.
- No downloadable PDF file generated automatically.

---

## DEC-009: GPS-Based Provider Attendance with 800m Geofence

**Date:** 2026-07-06–2026-07-08
**Status:** Decided — active

**Context:**
Providers/employees need to check in/out from branches. The system must verify they are physically near the branch.

**Chosen Option:**
- Capture employee browser geolocation on check-in.
- Compare with branch coordinates resolved from Google Maps `maps_link`.
- Reject check-in if distance > 800m.
- Two bypasses: client-side skips the check-in call for global superadmins with no `branch_id`; server-side (`/api/hr/attendance`) always allows `superadmin@revera.com` regardless of role/branch. See `PRODUCT_RULES.md` for exact logic.

**Trade-offs:**
- Geolocation can be spoofed; no server-side verification.
- Branch coordinates are derived from short Google Maps links at runtime.

---

## DEC-010: Supabase Auth + Employee Accounts for Admin Login

**Date:** 2026-07-06
**Status:** Decided — active

**Context:**
The admin panel was publicly accessible. A login gate was needed without building a full custom auth system.

**Chosen Option:**
- Supabase Auth email/password for login.
- `employee_accounts` table links Auth user to role/branch.
- `roles` table stores permission arrays.
- `/api/auth/me` verifies JWT and returns permissions.
- `superadmin@revera.com` hardcoded bypass for initial access.

**Trade-offs:**
- `/api/*` routes do not validate tokens server-side; gate is browser-only.
- Hardcoded superadmin email must be removed/parameterized when forking.

---

## DEC-011: Disabled "Coming Soon" Sidebar Placeholders, Superadmin-Only

**Date:** 2026-07-20
**Status:** Decided — active

**Context:**
Product wants to signal upcoming admin sections (Marketing, Customer Support, Reports, Finance) without building them yet, and without exposing that roadmap to non-superadmin staff.

**Chosen Option:**
- Add 4 entries to `SIDEBAR_ITEMS` in `src/app/admin/page.tsx` with a `comingSoon: true` flag.
- Rendered `disabled`, greyed out (50% opacity), with `title="Coming Soon"` tooltip and the same `ChevronRight` chevron used by the Settings submenu indicator — no "Soon" badge.
- `permittedSidebarItems` explicitly excludes `comingSoon` items for every role except `superadmin` (which already receives the unfiltered `SIDEBAR_ITEMS` list).
- These are **not** related to the pre-existing mock-UI "Finances Dashboard" (`activeNav === "Finances Dashboard"`, gated by unused `financesExpanded` state) — that is a separate, older, hardcoded-data panel. See note in `RISKS.md` RISK-005.

**Trade-offs:**
- No actual navigation target exists yet for any of the 4 items — purely visual placeholders.
- Two different "Finance" concepts now exist in the codebase (the new disabled sidebar stub vs. the old mock `Finances Dashboard`) — a naming collision future work should resolve by either wiring the new stub to the old dashboard or removing the old one.

---

## DEC-012: Bookings Schedule Grid — Doctors as Rows, Time Slots as Columns

**Date:** 2026-07-20
**Status:** Decided — active

**Context:**
The Bookings → Schedule view (`calendarView === "Schedule"` in `src/app/admin/page.tsx`) originally rendered time-of-day (15-min increments, 9:00–20:00) as table rows and doctors as columns, with only hourly rows labeled. This was flipped to match a reference layout: doctors as rows (sticky left column), time slots as columns (every column labeled, sticky header row).

**Chosen Option:**
- Same single-day view, same `bookingMap`/`normaliseSlot`/filter logic — only the row/column axes and merge direction (`colSpan={4}` instead of `rowSpan={4}` for the assumed 1-hour booking block) changed.
- Booking cells show patient name + status dot, phone number, and service name + status.
- Both empty and booked cells are height-capped (`84px` with `overflow-hidden` on the inner content wrapper) so a booking's cell never grows taller than an empty one — the cell's inline `height` style is only a CSS minimum in table layout, so this required an explicit fixed-height, overflow-hidden inner wrapper rather than relying on the `<td>` style alone.
- To avoid silently clipping bookings beyond what fits (RISK-009), each cell shows at most 3 booking cards; the rest collapse into a `+N more` button that sets `docFilter` + `dateFilter` to that doctor/day, resets status/type filters, and switches to the List view.
- Added a `dateFilter` state (List/Calendar previously had no date filter at all) wired into `filteredReservations`, with UI in the existing Filter modal (date input + clear) and an active-filter chip row in the List view header so the jump's filtered state is visible and reversible.

**Trade-offs:**
- Still single-day only in the Schedule view itself; no multi-day/week view was requested or built.

---

## DEC-013: Inline Customer Details Profile and Edit Drawer

**Date:** 2026-07-22
**Status:** Decided — active

**Context:**
The admin panel Customer profile (`viewingCustomerProfile`) and Customer edit form (`showCustomerFormModal`) originally rendered as fixed overlay popups (`fixed inset-0`) obscuring the dashboard. The user requested that these panels open inline within the Customers page view, following the pattern established for Employee management.

**Chosen Option:**
- Replaced the fixed overlay modal components in `src/app/admin/page.tsx` with an inline panel view rendered inside `activeNav === "Customers"`.
- Maintained conditional table rendering (`!viewingCustomerProfile && !showCustomerFormModal`) so opening a customer profile or edit form hides the customer table and displays the panel inline with a "Back to Customers" navigation header.
- Verified zero build/TypeScript errors using `npm run build`.

---

## DEC-014: Finance Module Is Management Accounting, Not Bookkeeping

**Date:** 2026-07-25
**Status:** Decided — active

**Context:**
The Finance sidebar section (a `comingSoon` stub since DEC-011) is to become a deep financial
analytics module. The stated goal is to let a **non-accountant clinic owner** understand the
clinic's finances without help.

**Alternatives Considered:**
- Full bookkeeping: chart of accounts, journal entries, double entry, trial balance
- Management accounting: purpose-built clinic metrics in clinic vocabulary
- Management first, with tables shaped so ledger entries could be generated later

**Chosen Option:** Management accounting, in clinic language.

**Reason:**
- A general ledger is an accountant's tool. Requiring an accountant to operate it defeats the goal.
- Everything the owner asked for (profit per session, monthly P&L, depreciation, debt, capacity,
  optimal service mix) is management accounting, not statutory reporting.
- Statutory books can be produced by exporting to the clinic's accountant.

**Trade-offs:**
- Output is not a legally-recognised set of books.
- If real bookkeeping is needed later it is an additional build, not a refactor of this one.

---

## DEC-015: Two-Level Costing — Contribution Margin Primary, Fully-Loaded Secondary

**Date:** 2026-07-25
**Status:** Decided — active

**Context:**
"True revenue from a session" requires deciding how fixed costs (rent, salaries, depreciation)
are charged to an individual session.

**Chosen Option:**
- **Primary metric — contribution margin**, with **no** fixed-cost allocation:
  `price − materials − doctor commission − device pulse cost`. This is the number used for all
  service-mix and pricing decisions.
- **Secondary view — fully-loaded cost**, allocating fixed costs by **room-minutes occupied**.
- Break-even analysis links the two.
- **Non-doctor salaries (nurse, technician, reception) are fixed overhead**, not per-session cost.
  Only doctor commission is genuinely variable per session.

**Reason:**
- Allocating fixed overhead to individual units is the classic cause of bad decisions —
  it makes profitable services look unprofitable when volume is low.
- Room-minutes is the honest allocation basis for a clinic: the constrained resource is chair time.
- Per-session staff logging was explicitly rejected: nurses and receptionists are paid the same
  regardless of session count, so attributing their salary per session adds staff burden without
  adding accuracy.

**Trade-offs:**
- Two numbers per service can confuse a non-specialist; the UI must label clearly which is for
  decisions and which is for full-cost curiosity.
- Staff productivity analysis is not possible without a `reservation_staff` table (deferred).

---

## DEC-016: Consumables Tracked By Standard Recipe, Editable At Completion

**Date:** 2026-07-25
**Status:** Decided — active

**Context:**
Nothing links a service to the materials it consumes — no BOM, recipe, or consumable concept
exists anywhere in the schema or code (verified by grep across `src/` and `supabase/migrations/`).

**Chosen Option:**
A `service_consumables` recipe defines standard consumption per service. On session completion the
recipe is auto-deducted, and staff may **edit the actual quantities** at that moment. Edited rows
are flagged so variance against standard is reportable.

**Reason:**
- A fixed recipe alone cannot capture waste or an unusually heavy session.
- Requiring staff to log every material from scratch on every session reliably fails in practice.
- The hybrid gives accuracy where it matters with near-zero friction in the common case.

**Trade-offs:**
- Recipes must be defined per service before per-session material cost is meaningful.
- Until then, the P&L uses total monthly material purchases as an unallocated expense.

**Note:** staff are already improvising this — `customer_product_balances.usage_history` free-text
notes contain entries like "Session #2 administered at New Cairo branch"
(`src/app/admin/page.tsx:11718`). That is the closest thing to consumption tracking today, and it
is unparseable.

---

## DEC-017: Per-Branch Fixed Asset Register With Straight-Line Depreciation

**Date:** 2026-07-25
**Status:** Decided — active

**Context:**
No asset, depreciation, useful-life or book-value concept exists in the schema.
`inventory_devices` tracks lasers operationally (serial, model, pulses) but has no purchase price,
purchase date, useful life, or salvage value — it is an ops list, not a financial register.

**Chosen Option:**
A dedicated `fixed_assets` table scoped by branch, with category (furniture / medical device / IT /
leasehold improvement), purchase date, cost, useful life in months, salvage value, and status.
Depreciation is **straight-line**: `(cost − salvage) / useful_life_months`, posted monthly to
`depreciation_entries`. `inventory_devices` links to it via `fixed_assets.device_id`, so a laser is
simultaneously an operational device and a depreciating asset.

**Reason:**
- Entering assets inside Branch Settings (the originally suggested approach) is simpler but cannot
  carry categories, disposal, or end-of-life alerts, and cannot link to `inventory_devices`.
- Straight-line is the standard, is what الإهلاك is normally understood to mean, and is trivially
  explainable to a non-specialist.

**Trade-offs:**
- Requires an accurate opening asset list from the clinic at setup.
- No declining-balance or units-of-production method (the latter would arguably suit lasers, whose
  wear is pulse-driven — device pulse cost is handled separately as a variable cost instead).

---

## DEC-018: Doctor Commission Is Configurable Per Doctor, With An Explicit Base

**Date:** 2026-07-25
**Status:** Decided — active

**Context:**
`providers.commission_type` / `commission_value` exist but `commission_type` has **no database
CHECK constraint** (`20260715202003_add_provider_payroll.sql:4`) — only the admin `<select>`
restricts it. Any unexpected value falls through both branches in the payroll calculation and
silently yields commission 0.

**Chosen Option:**
Each doctor has a **default commission** (fixed per session, percentage, or both combined) plus an
**editable per-service override** list in `providers.service_commissions`. The default is editable and
acts as the fallback when a service has no explicit override. The **commission base** remains global
per doctor (gross service price vs. net after materials) because it is a contract-level policy, not a
per-service one. Per-service overrides store only `type` (`none`/`fixed`/`percentage`) and `value`;
`fixed` means a flat EGP amount per session, `percentage` means a percent of the resolved base.
Commission is computed and **snapshotted per invoice line**, not re-derived monthly from a
name-string match.

**Reason:**
- Different doctors at the same clinic genuinely have different contracts.
- Making this configurable is also what makes the module reusable for other clinics.
- A stored per-line snapshot fixes RISK-015: renaming a doctor can no longer detach history.

**Trade-offs:**
- `commission_type` needs a CHECK constraint added and existing rows validated.
- Effective-dated commission history is still not modelled — changing a doctor's rate does not
  restate past sessions (which is correct), but there is no record of when it changed.

---

## DEC-019: Repair The Money Layer Before Building Finance Reporting

**Date:** 2026-07-25
**Status:** Decided — active

**Context:**
A 6-agent audit found that no reservation stores the price it charged, branch pricing has never
worked, patient debt only grows, stock is deducted twice per sale, and POS writes may be failing
silently. See RISK-010 … RISK-015.

**Chosen Option:**
Execute PROPOSAL-002 Phase 0 (verify + repair) and Phase 1 (immutable `invoices` / `invoice_lines`
/ `payments` / `wallet_txns` ledger) **before** any reporting UI. `customers.outstanding`,
`spent_amount` and `wallet_balance` become derived from the ledger rather than mutable scalars.

**Reason:**
- Reporting built on these inputs would be confidently wrong, which is worse than absent.
- The root cause is structural: every financial number is a mutable column on a mutable row, with
  no append-only structure to reconstruct history from. Reporting cannot patch over that.
- The expense/asset/liability tables (Phase 3) are new and isolated, so the repair work is
  concentrated entirely on the revenue side.

**Trade-offs:**
- Meaningfully delays the first visible Finance screen.
- Phase 0 touches live booking and POS code paths, so it carries regression risk in areas that
  currently "work" from the staff's point of view.

---

## DEC-020: Historical Data Is Backfilled As Visibly Estimated, Exact From A Cutover Date

**Date:** 2026-07-25
**Status:** SUPERSEDED the same day by DEC-026 — all existing data turned out to be mock.
Kept for the reasoning, which still applies to any clinic arriving with real history.

**Context:**
Existing reservations have no stored price, no payment dates, no material cost and no payment
method, so history cannot be reconstructed accurately.

**Chosen Option:**
Generate estimated invoices from historical reservations, flagged `is_estimated` on the row and
marked visibly in every UI that renders them. From an agreed cutover date, all data is captured
exactly through the Phase 1 ledger.

**Reason:**
- A pure cutover leaves the owner with no trends for months.
- A silent full backfill would present reconstructed numbers — priced at *today's* catalog, with
  no material cost — as if they were measured. That is the worse failure.
- Flagging makes the distinction the user's to judge rather than the system's to hide.

**Trade-offs:**
- Charts mix two data qualities; period-over-period comparisons spanning the cutover need a caveat
  in the UI, not just in this document.

---

## DEC-021: Tax-Inclusive Prices, With A Stored Rate; Products Have A Dual Role

**Date:** 2026-07-25
**Status:** Decided — active

**Context:**
No tax/VAT column, table or calculation exists anywhere on the revenue path. The two `14%`
occurrences (`src/app/admin/page.tsx:9817, 10403`) are display-only multipliers in the inert
e-commerce cart and persist nothing.

A second, more important point surfaced in discussion: **the same stock item can be sold to a
patient as a retail product OR consumed as a material inside a service.** Keeping two pricing
regimes for one item would be a permanent source of confusion.

**Chosen Option:**
- All prices are stored **tax-inclusive (gross)** — sale prices and purchase costs alike.
- A `tax_rate` is stored **on the line**, so a tax split can be derived later without a migration:
  `tax = gross × rate / (1 + rate)`.
- `inventory_products` gains a **role** flag: `retail` / `consumable` / `both`. The same product may
  appear simultaneously in `service_consumables` (as a cost) and `product_sales` (as revenue).

**Reason:**
- One gross price per item, whichever role it is playing — no dual pricing regime.
- Storing the rate rather than a split keeps the door open without paying for it now.
- Purchase costs recorded gross means the recorded cost is what the clinic actually paid, which is
  correct when input VAT is not reclaimable.

**Trade-offs / open:**
- The exempt-vs-taxable treatment of medical services versus retail product sales under Egyptian
  law was **not verified** and must be confirmed with the clinic's accountant. The design holds
  either way, which is why it was chosen.
- Reporting a legally-formatted tax return is out of scope (DEC-014).

---

## DEC-022: Finance Permissions Are Grantable AND Revocable

**Date:** 2026-07-25
**Status:** Decided — active

**Context:**
Requirement: whoever is granted the permission sees Finance — admins by default, plus anyone
granted it from Role Permission settings.

**This does not work today.** `hasStaffPermission` (`src/lib/access.ts:54-56`) short-circuits:
`role === 'superadmin' || role === 'admin' || permissions.includes(permission)`. Any role named
`admin` passes **every** permission check and the permissions array is ignored entirely. Finance
could be granted but never revoked from an admin. `PERMISSION_STRUCTURE`
(`src/app/admin/page.tsx:403-464`) also has no `finance.*`, `hr.*`, `inventory.*` or `employees.*`
keys at all — live sections work around this by hardcoding role names at `:703`.

**Chosen Option:**
1. Add `finance.*` keys to `PERMISSION_STRUCTURE`.
2. Seed the `admin` role's permissions array with Finance — admins have it by default, as required.
3. Finance checks use a helper that short-circuits **only** on `superadmin`, not on `admin` — so the
   permissions array is authoritative and Finance is revocable from Role Permission settings.
4. Leave the other permissions on the existing short-circuit for now; migrating them all is a
   separate change with real regression risk.

**Reason:**
- Delivers the stated requirement exactly, with the blast radius limited to the new section.
- The practical risk being avoided: appointing a branch manager with the `admin` role would
  otherwise expose every employee's salary and every service's margin, silently.

**Trade-offs:**
- Two permission-evaluation paths coexist until the wider fix lands — must be documented in code.
- Wiring a section requires editing **four** separate maps (`PERMISSION_STRUCTURE`, `hasPermission`'s
  `parentScreenMap` `:681-687`, `permittedSidebarItems`' map `:706-714`, and the redirect effect's
  map `:2098-2104`). The existing Rooms entry is already broken this way — it is gated on
  `settings.rooms`, which does not exist (`:7262`), so no non-superadmin can ever see it.

---

## DEC-023: Packages Are First-Class, With Deferred Revenue Recognition

**Date:** 2026-07-25
**Status:** Decided — active

**Context:**
The clinic sells prepaid multi-session packages (e.g. "6 laser sessions") and confirms this is
**core to the business**. No package concept exists anywhere — a grep for
`package|sessions_remaining|sessions_left|remaining_sessions` across `src/app/api` and
`supabase/migrations` returns nothing. `customer_product_balances` is retail-only by construction.

Staff are already improvising: the usage-log placeholder reads
`"e.g. Session #2 administered at New Cairo branch"` (`src/app/admin/page.tsx:11718`) — session
consumption is being written into a free-text notes field, unparseable.

**Chosen Option:**
New tables: `packages`, `package_items`, `customer_packages`, `customer_package_items`.
Money received for a package is **deferred revenue (a liability)**, not income. Revenue is
recognised **per session delivered**, pro-rata:

```
recognised per session = price_paid / total_sessions_in_package
deferred balance       = Σ price_paid × qty_remaining / qty_total
```

**Reason:**
- Without this the P&L is wrong in the most damaging direction: it books cash received as profit
  earned, so a month with heavy package sales looks far more profitable than it was, while the
  months delivering those sessions look like losses.
- Pro-rata allocation spreads any package discount evenly and is explainable to a non-specialist.
- Undelivered sessions are a genuine obligation and belong on the liability side.

**Trade-offs:**
- Adds real scope to Phase 1 and Phase 2.
- Package expiry policy must be decided (does an unused session expire, and if so is the deferred
  balance then recognised as revenue?) — **still open**.
- Committed-but-undelivered sessions are also pre-booked future capacity, so Phase 5's
  max-potential calculation must net them out rather than treating all capacity as sellable.

---

## DEC-024: Attached Products & Consumables Included in Booking Invoice Total

**Date:** 2026-07-30
**Status:** Decided — active

**Context:**
Previously, when doctors or receptionists attached products/consumables to a booking drawer or via clinical notes, the products were listed but the booking `amountLeft` / session outstanding and overall `Total Price` did not incorporate the cost of attached products.

**Chosen Option:**
1. Compute `productsCost` dynamically from `viewingBooking.attachedProducts` array and note entries.
2. Calculate `totalPrice = servicesCost + productsCost`.
3. Recalculate `sessionLeft = Math.max(0, totalPrice - sessionPaid)` when adding products or opening the booking drawer.
4. Added test `TC-025` to the System Test Suite in Admin Settings to verify attached products recalculate total invoice price and session outstanding balance.

---

## DEC-024: Opening Balances Are Bidirectional And Generic Across Clinics

**Date:** 2026-07-25
**Status:** Decided — active

**Context:**
At setup, any clinic may be owed money by patients **and** owe patients money — wallet credit or
undelivered packages. This is a product requirement, not a Revera one: different clinics will
arrive with different mixes.

Note that the existing `customers.outstanding` figures cannot be trusted as a starting point:
they only ever grow and are never decremented on payment (RISK-012), so they are inflated by an
unknown amount.

**Chosen Option:**
A single opening-balance import, run once per clinic at setup, writing into the **same** ledgers as
normal operations with an `is_opening` flag and a shared `as_of` date. Both directions supported:

| Direction | What it represents |
|---|---|
| Patient owes clinic | receivables (verified by physical audit, **not** migrated from `outstanding`) |
| Clinic owes patient | wallet credit balances |
| Clinic owes patient | undelivered package sessions (deferred revenue) |
| Clinic owes supplier | payables |
| Clinic assets | cash/bank, inventory at cost, fixed assets with accumulated depreciation to date |
| Clinic liabilities | loans at **remaining** balance, not original principal |

**Reason:**
- Writing into the same ledgers means no downstream report needs to special-case opening data.
- Bidirectional by design makes the module portable to any clinic, per DEC-001's fork-per-client model.
- Forcing a physical audit of receivables rather than importing `customers.outstanding` prevents
  RISK-012's inflated figures from being baked in as "verified" opening data.

**Trade-offs:**
- Setup requires real effort from the clinic — a stock count and a receivables audit.
- If opening balances are wrong, every derived balance stays wrong; the import needs a review-and-
  confirm step, not a blind CSV load.

---

## DEC-025: Expired Package Sessions Either Convert To Revenue Or Are Extended

**Date:** 2026-07-25
**Status:** Decided — active
**Closes the open question left by DEC-023.**

**Context:**
A package carries a validity period. When it lapses with sessions undelivered, the clinic is
holding money against an obligation it will now never perform. Something has to happen to that
deferred balance — leaving it deferred forever would permanently understate profit and inflate
liabilities.

**Chosen Option:**
Two permitted outcomes, both supported:

1. **Convert to revenue (breakage).** The remaining deferred balance is recognised as revenue in
   the period the package expired. The `customer_package` moves to status `expired`.
2. **Extend.** The expiry date is pushed out and the balance stays deferred. Available both as a
   per-package default (`packages.on_expiry = 'extend'` with `extension_days`) and as a manual
   per-customer action, since extending is usually a goodwill decision made case by case.

`packages.on_expiry` ∈ `recognise_revenue` | `extend` sets the default. The manual extend action
is always available regardless of the default, and every extension is recorded with who did it and
when.

**Reason:**
- Both outcomes happen in real clinics; forcing one would make the module wrong for some of them,
  which conflicts with the reusable-across-clinics goal.
- Breakage revenue is real income and should be visible as its own line, not silently mixed into
  service revenue — a month with unusual breakage should be legible as such.
- Recording who extended a package and when prevents it becoming an untracked way to hide an
  aging liability.

**Trade-offs:**
- Breakage recognised on expiry is a judgement call about when the obligation ends. If the clinic
  habitually honours expired packages anyway, recognising breakage overstates profit — the manual
  extend action exists precisely so that policy and practice can be kept aligned.
- Requires an expiry sweep (scheduled job or on-read evaluation); a package does not expire itself.

---

## DEC-026: No Historical Backfill — All Existing Data Is Mock

**Date:** 2026-07-25
**Status:** Decided — active. **Supersedes DEC-020.**
**Update 2026-09-25:** partially superseded by DEC-086 — real historical bookings now do get backfilled invoices.

**Context:**
Every reservation, customer, sale and inventory row currently in the database is test data entered
during development. Production has never gone live. There is no real clinic history anywhere in the
system.

**Chosen Option:**
Build **no backfill machinery at all**. Drop the `is_estimated` flag from the Phase 1 invoice
schema and drop the reconstruct-from-reservations step. Real data begins when the clinic starts
operating on the finished system; everything before that is discarded, not migrated.

**Reason:**
- Reconstructing invoices from mock reservations produces mock invoices. It would cost real
  implementation effort to manufacture numbers nobody should ever look at.
- It removes the hardest correctness problem in Phase 1: historical rows have no stored price, no
  payment method, no material cost and no payment dates, so any backfill was always going to be an
  estimate carrying a permanent "do not trust this" caveat.
- It also retires several awkward consequences recorded elsewhere — see below.

**What this cancels:**
- The `is_estimated` invoice flag and every UI marker for it.
- The RISK-011 warning against retroactively applying branch pricing to historical bookings.
  There are no historical bookings worth pricing.
- The RISK-013 requirement for a physical stock count to repair double-deducted quantities. The
  current quantities are fictional; the real count happens at clinic onboarding regardless.

**What this does NOT cancel:**
- **DEC-024 opening balances stays, and becomes more important.** A real clinic still arrives with
  cash, stock, patient debts, wallet credit and undelivered packages on day one. That is an opening
  balance import, not a history backfill — a different thing, and the only one now being built.
- The cutover concept survives in a simpler form: the date the clinic starts real operations.
  No mixed-quality reporting periods, so no UI caveats needed.

**Trade-offs:**
- No trend data on day one. Accepted: the alternative was fabricated trend data.
- If a future clinic arrives wanting its old system's transaction history imported, that capability
  will have to be built then. DEC-020's reasoning is preserved above for that case.

---

## DEC-027: Modular Admin Sections Are Mandatory

**Date:** 2026-07-26
**Status:** Decided — active

**Context:**
`src/app/admin/page.tsx` is a large legacy client component containing Booking, Customer, Doctor,
and many other section implementations. Adding new sections to that file increases regression risk,
makes ownership unclear, and further slows targeted work.

**Chosen Option:**
- Every new admin section must be implemented as a focused submodule under `src/components/admin/`.
- `src/app/admin/page.tsx` is limited to the legacy shell and composition of those submodules; new
  section-level view code, state, and data orchestration must not be added there.
- Existing Booking, Customer, Doctor, and all other legacy sections will be extracted incrementally
  when they are touched or through dedicated refactor tasks. No large-bang rewrite is permitted.

**Trade-offs:**
- Some shared state will temporarily remain in the legacy shell while a section is being extracted.
- New feature delivery may require creating a small module boundary first, which is accepted to stop
  the legacy file from growing and to make the staged extraction safe.

---

## DEC-028: Dev Schema Baseline Replaces the Legacy Migration Sequence

**Date:** 2026-07-26
**Status:** Decided — active

**Context:**
The 32 hand-authored migrations were out of order and could not provision a Supabase CLI shadow
database: the first customer migration altered `reservations` before any migration created it. The
linked dev database was the verified source of truth, while main remains a separate reconciliation
project.

**Chosen Option:**
- Use the direct dev schema dump as `20260726000000_dev_schema_baseline.sql`.
- Archive the 32 prior scripts in `supabase/migrations/_legacy/`; they preserve history but are not
  active migrations and must never be executed again.
- Replace the linked dev database's migration-history entries with the sole baseline entry.
- Treat a `db pull` shadow replay with "No schema changes found" as successful baseline validation.

**Trade-offs:**
- Main cannot receive an automatic incremental migration chain from dev; it requires a direct schema
  review and deliberate cutover to the baseline.
- The baseline reproduces the current schema, not historical data or the reasons for every old
  change. The archived files and this decision preserve that context.

---

## DEC-029: `/api/customers` Scopes Patients To Their Own Record Instead Of A Blanket Staff Gate

**Date:** 2026-07-26
**Status:** Decided — active

**Context:**
RISK-018 required authenticating every money-adjacent API route, including `/api/customers`. But
this route has two genuinely different caller populations: staff (reception/admin, full access) and
**patients**, who call it directly for OTP self-lookup (`AuthModal.tsx`) and profile self-service
(`profile/page.tsx`). There is no separate patient login — a patient's only credential is their
Supabase Auth session from OTP verification.

A blanket `requireStaffAccess` gate was written first and would have shipped: it compiled, and
nothing in the type system or a cursory read flagged the problem. It was caught only by checking
what actually calls this route — none of the six patient call sites send a staff token, and none
of them are staff, so every one would 403. That would have broken login and registration entirely.

The next-simplest fix — swap to "any authenticated Supabase user may read/write" — has a different
failure mode: it would let **one patient read or overwrite another patient's record**, including
debt, wallet balance and address, by guessing or brute-forcing a mobile number. An authenticated
caller is not the same thing as an authorized one.

**Chosen Option:**
- `classifyCaller()` (`src/app/api/customers/route.ts`) tries `requireStaffAccess` first; a 403
  ("valid session, not staff") falls through to the new `requireAuthenticatedUser`
  (`src/lib/access.ts`) rather than rejecting, distinguishing "unauthenticated" from
  "authenticated, not staff."
- A patient caller is scoped to **their own record only**, via `isOwnIdentity()` in the new
  `src/lib/customerIdentity.ts`. Ownership prefers the durable `customers.auth_user_id` link
  (added by `20260726000100_add_customer_auth_user_id.sql`) and falls back to normalized phone /
  lowercased email for the rows that predate that column — i.e. every row today.
  `GET` backfills `auth_user_id` the first time ownership is confirmed, so the fallback path
  narrows over time rather than being needed forever.
- The full customer list (`GET` with no `mobile`/`email`) is staff-only. A patient's lookup for an
  identity that resolves to someone else returns `null`, not that person's data.
- Financial fields (`spent_amount`, `outstanding`, `wallet_balance`) are accepted from the request
  body only on the staff path — a patient POST cannot set or clear their own debt or wallet balance
  regardless of what the body contains.

**Reason:**
- The two failure modes above — lockout and IDOR — are both worse than the status quo (fully open).
  Scoping by identity is the only option that closes the security gap without breaking the product.
- Using `auth_user_id` where available rather than always string-matching phone/email is more
  robust (Egyptian mobile numbers appear in the codebase in at least two formats — see
  `normalizeEgyptMobile`) and is the direction the schema should move in regardless.

**Trade-offs:**
- Two auth helper calls in the failure path (`requireStaffAccess` then `requireAuthenticatedUser`)
  for every non-staff request — an accepted cost on a low-traffic self-service endpoint.
- `isOwnIdentity()`'s phone/email fallback is inherently weaker than the FK match; a patient whose
  phone number is later reassigned to someone else (a real telecom scenario) could theoretically
  match an old unlinked row. This narrows automatically as `auth_user_id` backfills, and does not
  apply to any row already linked.

---

## DEC-030: Package Session Delivery Is Recorded as a Revenue-Recognition Event

**Date:** 2026-07-26
**Status:** Decided — active

**Context:** Package cash is invoiced at sale time but remains deferred revenue under DEC-023.
Delivering a package session must release the earned amount without creating a duplicate
customer-facing sale or leaving a mutable, unauditable balance on `customer_package_items`.

**Chosen Option:** `package_revenue_recognitions` records one immutable management-accounting event
per consumed entitlement item and completed reservation. It stores the recognised amount, timestamp,
reason, and staff identity; the unique `(customer_package_item_id, reservation_id)` constraint
prevents duplicate revenue recognition. `customer_package_items` remains the session-count source of
truth. A transactional RPC changes both the entitlement counts and recognition event together.

**Trade-offs:**
- A small table and transactional RPC add more schema than a mutable invoice annotation, but protect
  against duplicate session delivery and rounding drift.
- Breakage is represented by the same event ledger with `reason = 'expiry_breakage'`; its scheduled
  expiry-processing flow remains separate follow-up work.

---

## DEC-031: Stock-Movement References Use Text for Legacy POS Compatibility

**Date:** 2026-07-26
**Status:** Decided — active

**Context:** Phase 2 stock movements are caused by new UUID rows (`purchase_lines`,
`consumption_entries`) and legacy POS rows whose `product_sales.id` values are text such as
`'sale-<timestamp>-<random>'`.

**Chosen Option:** `stock_movements.ref_id` is an unconstrained text polymorphic reference. Writers
store the source row's ID as text and rely on `reason` to identify its source table.

**Trade-offs:** A database FK cannot validate these heterogeneous sources, but forcing UUID would
silently exclude POS movements or require an unnecessary legacy identifier migration.
---

## DEC-032: Added settings.terms Granular Permission for Booking Terms & Conditions

**Date:** 2026-07-26
**Status:** Decided — active

**Context:**
The admin panel required granular permission control specifically for managing booking Terms & Conditions (`settings.terms`), granting administrators individual control over access to clinic terms editing independently of general booking settings.

**Chosen Option:**
- Added `settings.terms` key to `ALL_PERMISSIONS` and included it by default in `Super Admin`, `Admin`, and `Clinic Manager` role templates.
- Registered `"Terms & Conditions": "settings.terms"` in admin settings router, sub-navigation array, role checking helpers, and UI conditional views in `src/app/admin/page.tsx`.

---

## DEC-033: Recording a Purchase Updates the Product's Stock and Cost Price (Last-Cost Basis)

**Date:** 2026-07-27
**Status:** Decided — active

**Context:** Building the Purchases screen (task 3B.10) surfaced a gap the user caught while
testing the flow, not something found by an audit: `inventory_products.stock_quantity` and
`purchase_price` ("Cost Price" in the product modal) are still directly-written scalars, not yet
derived from `stock_movements` (task 2.12 is comparison-only — see the note on `stock_quantity` in
`DB_SCHEMA.md`). `POST /api/purchases` wrote an inbound `stock_movements` row per line but never
touched either scalar. Result: recording a purchase would not visibly restock anything in the
Products Catalog, and `Cost Price` would silently go stale the first time a supplier's price
changed — while still requiring staff to re-enter a unit cost on every purchase that fed nothing
back.

**Chosen Option:**
- `POST /api/purchases` now calls a new `restockInventoryProduct()` (`src/app/api/inventory/products/route.ts`,
  symmetric to the existing `deductInventoryStock()` used by sales) once per line: adds `qty` to
  `stock_quantity`, and **overwrites `purchase_price` with that line's `unit_cost`** — last-cost,
  not a weighted average.
- Multiple lines for the same product within one purchase are applied **sequentially**, not via
  `Promise.all` — `restockInventoryProduct` does a read-modify-write of the whole catalog (the same
  `page_settings` + table dual-write `deductInventoryStock` uses), so concurrent calls for the same
  product would race and silently drop an update.

**Reason:**
- Last-cost is the simplest model that keeps `Cost Price` (and everything derived from it — margin
  display, the Stock Valuation card) representative of what the clinic actually paid most recently,
  without weighted-average accounting this clinic's scale doesn't need.
- Symmetric to the existing sales-side design (task 0.4: one clear owner of a stock mutation) rather
  than inventing a different pattern for the inbound side.

**Trade-offs:**
- Last-cost discards purchase-to-purchase price history from the product record itself — the
  `purchases`/`purchase_lines` tables still hold the full history if it's ever needed (e.g. average
  cost reporting), this decision only concerns what `inventory_products.purchase_price` displays.
- `stock_quantity` is still a directly-written scalar on both the sale and purchase sides, not yet
  cut over to being derived from `stock_movements` — this decision does not change that; it only
  makes the purchase side consistent with how the sale side already works.

---

## DEC-034: Packages Get A Public Marketing Page Via A Separate Visibility Flag, Not `active`

**Date:** 2026-07-28
**Status:** Decided — active

**Context:**
Packages (DEC-023) had zero public surface — admin CRUD only. The user asked for packages to be
shown on the public site the way Promotions already are. `packages.active` already exists and
gates whether a package can still be sold/consumed at POS; reusing it as the "show on the
website" flag would conflate two different questions (sellable vs. advertised).

**Chosen Option:**
- Added `packages.show_on_website` (boolean, default false) — independent of `active`. A package
  can stay active for existing customers while no longer being publicly advertised, or vice versa.
- Added `packages.name_ar` — the table only had one `name` column; the site is fully bilingual
  everywhere else.
- `GET /api/packages` was made public (no auth check), matching the existing `GET /api/services`
  convention — return everything unfiltered, filter client-side.
- Public display computes a "cheaper than buying separately" savings badge (à la carte total via
  the existing `getEffectiveServicePrice()` vs. the package price) rather than storing a
  precomputed discount — stays correct automatically if either changes.
- No online self-serve purchase — a package can't go through the single-service `BookingModal`,
  and building real online payment collection was out of scope. The public card's CTA opens a
  WhatsApp inquiry instead, mirroring the deposit-payment WhatsApp flow `BookingModal` already uses.

**Reason:**
- Matches this codebase's established "separate flags for separate concerns" pattern rather than
  overloading one boolean (the same ambiguity RISK-030 flagged for Promotions' "Enabled" toggle
  doubling as both a marketing gate and the checkout-discount switch).
- No new abstractions needed — `getEffectiveServicePrice`/`getServicePriceDetails` already existed
  and were already proven correct for Promotions' pricing math.

**Trade-offs:**
- Packages sold online still don't exist — this only makes them discoverable/advertised.
- `show_on_website` is a second flag staff must remember to set, in addition to `active`.

---

## DEC-035: Package Session Redemption Only Happens At Checkout, Never As A Bare Button

**Date:** 2026-07-28
**Status:** Decided — active

**Context:**
The packages purchase/consumption backend (`customer_packages`, `customer_package_items`,
`package_revenue_recognitions`, the `consume_customer_package_session` RPC, and the
`/api/packages/sell|consume|extend` routes) existed since DEC-023/025 but no UI anywhere called
any of it — staff could not sell, view, or redeem a package. Wiring this up raised two open
questions: where should "use a session" happen, and how strictly should it be gated.

**Chosen Option:**
- Redemption can **only** happen as part of completing a real booking (the Payment Settlement /
  checkout modal), never as a free-standing "deduct" button like the Products tab's "Log Usage."
  This is not a preference — `package_revenue_recognitions.reservation_id` has `ON DELETE
  RESTRICT` plus a unique `(customer_package_item_id, reservation_id)` constraint, and
  `consume_customer_package_session` itself rejects a non-completed reservation. A bare-click
  redemption has no reservation to attach the revenue-recognition event to.
- Staff still get **visibility** of a patient's active packages/promotions wherever a patient is
  in view (the booking detail drawer, manual booking creation, and checkout) via a shared
  `PatientPackagePromoBanner` component — informational there, actionable only at checkout.
- **Redemption is disabled whenever a deposit was already collected on the booking**
  (`amountPaid > 0` before that checkout). Deposits are booking-level, not per-service; waiving a
  service's price after cash was already taken against it would need refund/reversal logic this
  feature doesn't build. The UI shows an explanatory note rather than silently blocking it.
- Sell/redeem actions stay behind `requireStaffAccess` server-side (any authenticated staff,
  matching the existing `/api/packages/sell|consume` routes) plus the same coarse client-side
  role-list check the Products tab already uses (`superadmin/admin/receptionist/doctor`) — no new
  granular `hasPermission("packages.sell")`-style key was introduced.
- A redemption call that fails **after** the completing checkout PATCH already succeeded does not
  roll anything back — the booking stays completed and correctly charged for the non-redeemed
  amount. Staff instead get an explicit alert naming what needs manual reconciliation.

**Reason:**
- Respects DEC-023's deferred-revenue model as designed rather than working around it.
- A silent rollback of an already-successful checkout would be worse than a clearly-surfaced
  manual-reconciliation case — money already changed hands correctly for everything else on that
  booking.

**Trade-offs:**
- A booking with any deposit collected can't redeem a package this session — staff must complete
  it as a cash/wallet payment instead. No refund-then-redeem flow exists yet.
- No granular permission key means any staff account (not just specific roles) can sell/redeem
  packages once past the coarse role-list gate — consistent with existing Products-tab precedent,
  not a new gap introduced here.

---

## DEC-036: Promotions + Packages Live Under A "Marketing" Nav Section, Not Their Own Top-Level Items

**Date:** 2026-07-29
**Status:** Decided — active

**Context:**
Promotions was its own top-level sidebar item, fully inline in `admin/page.tsx`. Packages' admin
screen (`PackageAdminPanel.tsx`, already a proper DEC-027-compliant submodule) lived as a sub-tab
under Services ("Package Offers"). The user pointed out both are conceptually "marketing offers"
and asked to consolidate them under the sidebar's existing `Marketing` placeholder
(`comingSoon: true`, unused until now), with "Marketing Campaigns" (an existing orphaned SMS-blast
mock screen) reserved as a third tab **later**.

**Chosen Option:**
- Activated `Marketing` as a real submenu-parent sidebar entry (mirrors the existing `Settings`
  submenu pattern exactly — a `marketingExpanded` toggle, a literal sub-items array, not a
  generic data-driven submenu). Sub-items: `Promotions`, `Packages`. `Marketing Campaigns` is
  deliberately left out of that array for now — its existing (orphaned) JSX block is untouched,
  so adding it later is a one-line addition.
- Extracted Promotions in full (state + handlers + JSX, ~530 lines) into a new
  `src/components/admin/marketing/PromotionsAdminPanel.tsx`, taking `localServices`,
  `setLocalServices`, `branches`, `syncServicesToApi` as props — this is the DEC-027
  "extract when touched" trigger, since the move required touching this code anyway.
- Re-parented `PackageAdminPanel` from the Services tab bar to its own `activeNav === "Packages"`
  destination — no changes to the component itself, since it already self-fetches everything via
  `session`.
- **Reused the existing `"services"` permission-prefix scope** for both `Promotions` and
  `Packages` in all three `parentScreenMap`s that gate sidebar visibility/access (rather than
  introducing a new `marketing.*` permission scope). This was a deliberate, explicit choice to
  keep this a pure nav reorganization — who can see Promotions/Packages must not change as a side
  effect of moving menus around.

**Reason:**
- Matches how staff actually think about these features ("what deals are we running"), not how
  the codebase happened to grow them.
- Reduces `admin/page.tsx`'s size and finally makes Promotions DEC-027-compliant, without
  redesigning RBAC in the same change (a separate, unrequested risk).

**Trade-offs:**
- The customer-profile "Purchased Packages" tab and checkout redemption logic (RISK-031/DEC-035)
  are customer *data*, not marketing *configuration* — they intentionally stay where they are,
  under Customers/booking flows, not moved here.
- `PromotionsAdminPanel` still shares the page-level `localServices` array by props rather than
  self-fetching (unlike `PackageAdminPanel`) — matches its pre-existing read-modify-write-the-
  whole-array behavior, but means it's not as fully decoupled from `admin/page.tsx` as Packages is.

## DEC-037: Capacity and Service Mix (5.9/5.10) Live As Finance Tabs, Not A New Reports Section

**Date:** 2026-07-30
**Status:** Decided — active

**Context:**
An open question deferred from 2026-07-26 asked whether Phase 5's capacity/break-even/service-mix
screens belong in Finance at all, since the underlying data (room-minutes, utilisation %, no-show
rate) is operational/planning data, not money-in/money-out like the rest of Finance. The tracker
had been defaulting to building them as Finance tabs (per DEC-027's modular-section pattern)
pending this decision.

**Chosen Option:**
Keep `CapacityScreen` and `ServiceMixScreen` as tabs inside `src/components/admin/Finance/`,
alongside the existing P&L/Cash Flow/Trend tabs, rather than standing up a new top-level
Reports/Data Analysis section.

**Reason:**
- A new section means new sidebar entry, new permission scope, and its own UI scaffolding — real
  added cost for a planning-vs-operational distinction a clinic owner likely doesn't care about
  when trying to answer "why is my utilisation low."
- The backend endpoints (`/api/finance/capacity`, `/api/finance/service-mix`) are location-agnostic
  — only which section renders them changes — so this is cheap to reverse later if it turns out to
  matter once more clinics use the product.

**Trade-offs:**
- Finance's tab bar keeps growing (13 tabs as of this change); if it becomes unwieldy, revisit
  grouping (as DEC-036 did for Marketing) rather than pulling Capacity/Service Mix out on their own.

## DEC-038: Inventory Product Delete Is Soft-Delete For Everyone, Hard-Delete Superadmin-Only

**Date:** 2026-07-30
**Status:** Decided — active

**Context:**
The Product Catalog's delete button called `DELETE /api/inventory/products`, gated only by
`requireStaffAccess` (any staff), which ran a real `.delete()` against `inventory_products` with
the Supabase error swallowed in an empty `catch (e) {}`. Since `consumption_entries.product_id` is
`ON DELETE RESTRICT`, deleting any product ever consumed in a checkout was silently rejected at the
DB layer while the endpoint still returned `{ success: true }` and removed the product from the
`page_settings` JSON fallback — the two stores diverged and the product reappeared on next load
(dual-storage prioritizes the DB table when non-empty). This is what "I can't delete the product"
actually was.

**Chosen Option:**
- Added `inventory_products.deleted_at` (migration `20260730000000_add_deleted_at_to_inventory_products.sql`,
  applied to dev via `supabase db push`).
- `DELETE /api/inventory/products?id=X` now soft-deletes by default for any staff member (sets
  `deleted_at`, row and its history stay intact) — this is the **only** delete path available to
  non-superadmins.
- `&hard=true` performs a real `.delete()`, but the route now checks `access.role === 'superadmin'`
  first and returns 403 for anyone else; a superadmin hitting an FK violation (e.g. consumption
  history) gets a clear 409 with a message pointing at soft delete, instead of a silent no-op.
  `GET /api/inventory/products` filters out anything with `deleted_at` set.
- Frontend (`src/app/admin/page.tsx` `handleDeleteProduct`): non-superadmins get the original single
  confirm (now soft-delete). Superadmins get a second confirm offering permanent delete (OK) vs.
  soft delete (Cancel).

**Reason:**
- This is a genuinely new convention for this codebase — every other delete endpoint
  (`employees`, `reservations`) is hard-delete-only, gated by `requireAdministratorAccess`
  (superadmin+admin). Products specifically need soft-delete because `consumption_entries`
  RESTRICTs the FK, so hard-delete-for-everyone was never actually going to work once a product had
  real usage history — soft-delete is the only option that doesn't require cascading deletes through
  sales/consumption/stock-movement history.
- Restricting hard-delete to superadmin specifically (not admin) was the user's explicit ask, not
  inferred — matches the existing `hasFinancePermission` precedent of treating `superadmin` as a
  distinct tier from `admin` for irreversible actions.

**Trade-offs:**
- No restore/undo UI exists yet — a soft-deleted product is simply hidden from every list. If a
  clinic needs products back, that's currently a direct DB fix, not a supported flow.

**Follow-up (2026-07-30, same day):** the UI's `window.confirm()`/`alert()` popups were replaced
with two distinct row buttons (superadmin) and a clean in-page modal (see the manual test file's
"Revision" evidence row and incident note for the test-script mistake that briefly soft-deleted two
real products — caught and restored the same session).

The user then flagged, correctly, that the *Finance* side of this needed to actually be closed, not
just the visible Stock Valuation stat (which already inherited the `GET` filter fix automatically).
Closed:
- `POST /api/inventory/products/sales` and `POST /api/purchases` now check `deleted_at` on the
  referenced product(s) and return `410` before writing anything — a soft-deleted product can no
  longer generate new `product_sales`/`invoice_lines` revenue or new `purchases`/`purchase_lines`/
  `stock_movements` restock activity. This was the actual integrity gap: soft-delete only hides a
  product from lists, it doesn't stop code that already has the product's ID from acting on it.
- `deductInventoryStock`/`restockInventoryProduct` (the two internal helpers everything above calls
  into) now also refuse to mutate a soft-deleted row directly, as defense in depth for any other
  caller that isn't gated at its own HTTP entry point.

**Remaining known gap:** `service_consumables` (a service's product recipe) and the checkout-time
consumption/costing path (`applyCheckoutCosting` in `reservations/route.ts`) still don't check
`deleted_at` — a service whose recipe already references a since-deleted product will keep costing
and consuming it silently at checkout. Deliberately left open: it requires a recipe that already
points at the product (staff can't newly pick a deleted product from a recipe editor's dropdown
today), so the blast radius is narrower than the sell/purchase paths that were closed. Revisit if
this surfaces in practice.

---

## DEC-039: Doctor Portal Session Flow, Consumables & Receptionist Checkout Settlement

**Date:** 2026-07-30
**Status:** Decided — active
**Note:** Landed on a separate remote session's branch as "DEC-036" — that number was already
taken by the Promotions/Packages Marketing-nav decision above, so this entry was renumbered to
DEC-039 while merging that branch into `dev` on 2026-08-03.

**Context:**
The clinic required improvements to doctor and receptionist roles:
1. Receptionists start treatment sessions ("Start Session"); Doctors end sessions via "Complete Treatment". Session remains ongoing until ended by Doctor.
2. Doctor schedule view provides structured date filtering (`Yesterday`, `Today`, `Tomorrow`, Date Picker) and replaces "Open Session" with an `Info` modal.
3. First-time patients require completing a Patient Medical Record intake before Doctor can complete treatment. Returning patients display full medical history.
4. Doctors can add session consumables (products from inventory) and extra device pulses during sessions, dynamically updating total booking cost.
5. In Admin Booking Details drawer, Products and Prescriptions sections are unlocked and connected to clinic inventory & prescription engine.
6. In Receptionist Checkout, attached session add-ons (products & extra pulses) display as line items and adjust remaining balance. Customer Information displays deposit paid as "Total Spent" and balance remaining as "Outstanding", updating to 0 upon checkout completion.

**Reason:**
Ensures clinic inventory tracking, medical compliance, and accurate financial record keeping across receptionist and doctor workflows.

---

## DEC-040: Booking Gets a Dedicated `/book` Page — Popup Kept Only as a Secondary "Quick Book"

**Date:** 2026-08-03
**Status:** Decided — active

**Context:**
The only way to book was `BookingModal`, a popup opened from a `window.dispatchEvent(new
CustomEvent("open-booking"))` fired from ~10 CTAs across the public site (Navbar ×2, HeroSlider,
ServicesSection ×3, HomeServicesSection ×2, AboutSection, AboutPageIntro, ContactPageContent,
profile page), with the component itself mounted redundantly on 6 different pages so each page's
listener could catch the event. Two problems this created: (1) a popup can't be deep-linked —
there was no URL a paid ad could point at that lands directly on the booking flow, and (2) a modal
is inherently more distracting/interruptive than a focused page for a flow this important.

The clinic owner also plans to use this route in paid ad campaigns, and — separately — pointed out
that if `BookingModal` avoids hardcoded client-specific values (it already imports `CLIENT` from
`src/config/client.ts` and uses CSS variable brand tokens, not raw hex), a dedicated booking page
carries over "for free" to any future fork under DEC-001's fork-per-client model. That observation
changed the framing of this decision: **the page doesn't need to be a separately-portable
module** — forking this repo already makes it portable, same as every other route.

**Chosen Option:**
- `BookingModal` gained two optional props — `variant?: "modal" | "page"` (default `"modal"`,
  preserving 100% of existing popup behavior unchanged) and `initialServiceId?: number | null`.
  No business logic (pricing, availability, deposit payment, `POST /api/reservations`) was touched
  — only the outer wrapper (overlay/backdrop vs. plain container), the close button, the Escape-key
  handler, and the post-submit success action are variant-aware. This was deliberate: this exact
  code path has a history of subtle bugs (RISK-010, RISK-011, RISK-029, RISK-035), so the lowest-
  regression-risk change was preferred over a bigger content-split refactor.
- New route `src/app/book/page.tsx` (Server Component, exports SEO `metadata`, reads `?service=`
  from `searchParams`) renders `<BookingPageClient>`, a minimal client shell (logo-links-home +
  language toggle only, no full nav/footer) wrapping `<BookingModal variant="page" />`. Category/
  service browsing already exists inside the modal's Step 1 (category chips + service picker) —
  the page shell doesn't duplicate it, to keep the page focused rather than adding a second
  browsing surface.
- Every trigger except Navbar's "Make Appointment" (desktop + mobile) now does
  `router.push("/book")` or `router.push(\`/book?service=\${id}\`)` instead of dispatching the
  event. **Navbar's CTA is kept as the popup ("Quick Book")** — the user's explicit call — since
  it's the highest-traffic, already-engaged-visitor entry point, where a fast in-context popup
  still beats a page navigation.
- `BookingModal`'s single remaining popup mount moved out of 6 per-page mounts into one place:
  `GlobalBookingModal` (a small client wrapper using `usePathname`) in the root layout, skipping
  render on `/book` itself (where the popup would be a redundant duplicate of the visible page
  flow).

**Reason:**
- A URL beats an event for ad landing pages — `/book?service=12&utm_source=...` is a real,
  shareable, trackable destination; a `CustomEvent` is not.
- Keeping the popup for Navbar's CTA (per explicit request) avoids forcing every visitor into a
  full page navigation for what is, for an already-browsing visitor, a quick action.
- Not attempting a "fully portable, framework-agnostic embeddable widget" was a deliberate scope
  cut, not an oversight — that would mean a public CORS-enabled API surface and a props-based
  branding contract instead of `config/client.ts`, which is real, unrequested scope beyond what
  DEC-001's fork-per-client model already provides for free.

**Trade-offs:**
- `GlobalBookingModal` still mounts (closed, inert) on every route including `/admin`, which never
  triggers it — a small, accepted inefficiency rather than adding an `/admin`-specific exclusion
  for a component that's already invisible and inactive there.
- If the "Quick Book" popup and the `/book` page ever drift in behavior, both now need updating —
  they share `BookingModal`'s internals via the `variant` prop specifically to minimize this risk,
  but the wrapper JSX/close-button/success-action branches are still hand-kept in sync.

---

## DEC-041: `customers.date_of_birth` Added Alongside Legacy `age`, No Separate "Incomplete" Flag

**Date:** 2026-08-13
**Status:** Decided — active

**Context:**
The clinic owner is digitizing years of paper client-intake forms (multiple clinics, several
different form layouts) into a spreadsheet for later import, with the explicit goal of running
birthday-based re-targeting campaigns (packages/offers timed around a patient's birthday). The
existing `customers.age` column is a static integer snapshot entered once — it goes stale and
cannot drive a recurring birthday campaign. No `date_of_birth` column existed at all. We also
discussed and dropped a separate "origin governorate vs. current residence" field (deemed added
complexity without a concrete use case — `area`/`address` already capture current residence,
which is what matters for branch-proximity targeting) and a dedicated "profile incomplete" boolean
flag.

**Chosen Option:**
- Added `customers.date_of_birth` (nullable `date`) via
  `supabase/migrations/20260813120000_add_date_of_birth_to_customers.sql`.
- `customers.age` is kept, unchanged, as the fallback for old records where only an age — never a
  real birth date — was ever collected on paper.
- No new "incomplete data" column. `date_of_birth IS NULL` is treated as the completeness marker
  for the re-targeting campaign query, rather than duplicating that state in a second field.

**Reason:**
- A real date is required to drive a recurring (yearly) birthday campaign; an age snapshot cannot.
- Keeping `age` avoids silently losing data for legacy patients whose paper forms never captured a
  birth date and where a real DOB can no longer be obtained.
- A dedicated boolean flag for "incomplete" would just restate `date_of_birth IS NULL` in a second
  place that could drift from the real data — rejected as unnecessary complexity per current scope.

**Trade-offs:**
- `age` and `date_of_birth` are two independent, unreconciled fields — the schema does not enforce
  or compute one from the other, so they can disagree for a given patient and nothing flags that.
- If reception staff later need to distinguish "never asked for DOB" from "asked, patient declined
  to share," `NULL` alone cannot tell those apart — deferred until that distinction is shown to
  matter in practice, not built speculatively now.
- No import tooling exists yet to load the historical spreadsheet into `customers`/`reservations` —
  this decision only adds the destination column; building the actual import path is separate,
  unscoped work.


---

## DEC-042: Session-Added Products/Services/Pulses Get A Real `reservation_products` Staging Table, Feeding `invoice_lines` Directly — Not A New Parallel Ledger

**Date:** 2026-08-17
**Status:** Decided — active, **implemented and live-verified 2026-08-17.** Migration
(`20260817020000_create_reservation_products.sql`) applied to the dev database; code verified
(`tsc`/`eslint`/`vitest` all clean) and end-to-end tested via the real API — a write immediately
reflected on the next read, and a doctor-added product correctly appeared as its own `invoice_lines`
row at completion. See "Implementation" below for exactly what landed and the remaining known gap
(COGS/commission snapshot on these lines).

**Context:**
While live-testing a real booking through Approve → Start Session → Complete Treatment → Pay &
Settle (RISK-053…057), a doctor-added product (700 EGP) turned out to be invisible on the printed
invoice and the reception drawer's product panel, even though the reservation's own
`amount_paid`/`amount_left` were correct. Chasing the root cause surfaced something worse than a
display bug:

1. **The intended structured design already exists in the frontend and was never finished.**
   `admin/page.tsx`'s `handleAddProductToViewingBooking` (~line 1383) sends `attachedProducts` in
   its `PATCH /api/reservations` body, and three separate read sites (`viewingBooking`'s Price
   Details, its "Products & Session Consumables" panel, and the invoice PDF) all check
   `Array.isArray(viewingBooking.attachedProducts)` **first**, before falling back to regex-parsing
   `notes`. But `PATCH /api/reservations`'s field whitelist
   (`src/app/api/reservations/route.ts:787`) never destructures `attachedProducts` — it is silently
   dropped by Supabase's `.update()` on every call. The fallback (parsing free-text `notes`) has
   been the *only* path that has ever actually worked, which is why it broke twice (RISK-038,
   RISK-057) and will keep breaking: any new caller writing a differently-worded note silently
   reproduces the same bug class.
2. **The real financial ledger DEC-019 built (`invoices`/`invoice_lines`) never receives this
   revenue at all — not a display gap, a reporting gap.** `writeCheckoutInvoice()`
   (`src/app/api/reservations/route.ts:263`), the only function that ever inserts into `invoices`/
   `invoice_lines`, builds its `lines` array solely from `serviceIds` — it has no parameter for
   products, additional services, or device pulses. Every EGP a doctor adds during a session via
   Products/Additional Services/Extra Pulses reaches `reservations.amount_paid`/`amount_left`
   correctly (RISK-038's earlier partial fix) but **never becomes an `invoice_lines` row**. Since
   Finance's P&L/margin/commission reporting is built on this ledger (DEC-019), every session with
   a doctor-added extra is under-reported there today — this upgrades RISK-038's Defect #3 from "a
   traceability gap, not a money-loss gap" to a real Finance under-reporting gap, not just a
   receptionist-facing display inconsistency.

**Alternatives Considered:**
- **Keep patching the `notes`-regex reconstruction.** Rejected — this is the *second* time the
  exact same bug (a new note-writer, an unmatched pattern) has shipped (RISK-038 → RISK-057, and
  RISK-057 itself turned out to have three independent copies of the same broken logic). Patching a
  fourth or fifth copy the next time a new "add X during a session" feature ships is not a fix, it
  is the failure mode repeating.
- **Finish wiring the existing `attachedProducts` field as a JSONB column on `reservations`.**
  Cheaper than a new table (no join), and would fix the immediate display bug. Rejected as the
  primary fix because it does nothing for the deeper gap: `writeCheckoutInvoice` would still need
  to be taught to read it and turn it into `invoice_lines` at completion, and a JSON array on the
  reservation row can't cleanly carry a real FK to `inventory_products` (for stock-deduction
  traceability, matching how `consumption_entries`/`purchase_lines` already reference products by
  FK, not by name string) or per-line metadata (`added_by_employee_id`, `added_at`, whether it came
  from the doctor's session or reception's drawer) without becoming an ad hoc schema inside a
  column.
- **A standalone `reservation_products` table treated as its own permanent ledger, independent of
  `invoices`/`invoice_lines`.** Rejected — this is what the user asked to sanity-check, and it is
  the wrong shape specifically *because* DEC-019 already built and is actively extending
  (`invoice_lines`, `payments`, `consumption_entries`, `purchase_lines`) the one ledger Finance
  reports from. A second, parallel table holding the same kind of revenue-bearing rows would need
  its own reconciliation against `invoice_lines` forever — exactly the "several independent
  regex-based reconstructions of the same fact" anti-pattern this investigation just found and is
  trying to close, just moved into two persisted tables instead of three parsers.

**Chosen Option:**
A `reservation_products` table, scoped as **pre-invoice staging that feeds `invoice_lines`, not a
parallel ledger**:

- Columns (indicative, to be finalized at implementation): `id`, `reservation_id` (FK →
  `reservations.id`), `product_id` (FK → `inventory_products.id`, nullable for the "Additional
  Service"/pulses case where there's no product row), `line_type` (`product` | `additional_service`
  | `device_pulses`), `service_id` (FK → `services.id`, nullable, for `additional_service`), `qty`,
  `unit_price`, `total`, `added_by_employee_id`, `added_by_role` (`doctor_session` |
  `receptionist`), `created_at`.
- `DoctorAccountView`'s "Add Product"/"Add Additional Service"/extra-pulses actions and the
  reception drawer's "+ Add Product" action write a real row here **at the moment the item is
  added** — no more building a `notes` sentence as the persistence mechanism. `notes` keeps carrying
  the doctor's actual clinical note text, nothing else.
- All three current display sites (drawer Price Details total, drawer "Products & Session
  Consumables" panel, invoice PDF) switch from `notes`-regex reconstruction to a real `SELECT ...
  WHERE reservation_id = ?` against this table. The regex parsers stay only as a **legacy-data
  fallback** for bookings completed before this ships, whose only record is the old `notes` text.
- `writeCheckoutInvoice()` is extended to also read `reservation_products` for the reservation being
  completed and emit one `invoice_lines` row per entry (mirroring the existing `buildInvoiceLine`
  call already used for services), so doctor/reception-added items finally reach the same
  `invoices`/`invoice_lines`/`payments` ledger DEC-019 established — closing the Finance
  under-reporting gap, not just the display one.
- Once an invoice is issued for a reservation, its `reservation_products` rows become historical
  input to that immutable invoice — same relationship `purchase_lines`/`consumption_entries` already
  have to their own downstream tables elsewhere in this schema.

**Reason:**
- Directly continues DEC-019's stated principle — "every financial number [was] a mutable column on
  a mutable row, with no append-only structure to reconstruct history from; reporting cannot patch
  over that" — instead of adding a second thing needing the same treatment later.
- A real FK to `inventory_products` (instead of a name string parsed out of prose) makes stock
  deduction, cost/margin calculation (DEC-015), and commission attribution (DEC-018) actually
  traceable per line, matching how every other line-item table in this schema
  (`invoice_lines`, `purchase_lines`, `consumption_entries`) already works.
- Normalizing "who added what, from where, when" as real columns (`added_by_employee_id`,
  `added_by_role`) is something neither the dead JSONB field nor the notes-text approach could ever
  give without becoming its own ad hoc parser.

**Trade-offs:**
- Every already-completed booking's session add-ons exist only as `notes` text — this decision does
  not include a backfill; the legacy-parser fallback is what keeps those historical bookings'
  invoices/drawers readable, not a migration of old rows into the new table.
- Widens `writeCheckoutInvoice`'s blast radius — it becomes the single place that must correctly
  reconcile services *and* session add-ons into one invoice, which is more logic in one already
  financially-sensitive function. Accepted: this is strictly better than the current state, where
  that same revenue reaches no ledger row at all.
- `cogs_snapshot`/`commission_snapshot` are left `NULL` on the `invoice_lines` rows generated from
  `reservation_products` — they don't run through `applyCheckoutCosting`'s `service_consumables`/
  `service_devices` recipe lookup (that lookup is keyed to the reservation's *primary* booked
  services, not ad-hoc additions). Matches `invoice_lines`' own established "not yet costed"
  convention (`DB_SCHEMA.md`) rather than fabricating a cost. Revenue is correct; COGS/margin
  reporting on these specific lines is not, until this gap is closed separately.

**Implementation (2026-08-17):**
- Migration: `supabase/migrations/20260817020000_create_reservation_products.sql`. One column
  beyond the original design above: `invoiced_at timestamptz`, nullable — marks a row as already
  folded into an `invoice_lines` row, so `writeCheckoutInvoice` only ever processes each row once.
- `GET /api/reservations` (`src/app/api/reservations/route.ts`) batch-fetches
  `reservation_products` for every reservation on the page (one query, not N+1) and attaches it as
  `attachedProducts` on each row — the exact field name and shape (`{id, name, qty, unitPrice,
  total, addedBy}`) the three display sites already checked for first, before their `notes`-regex
  fallback (RISK-057). **This means all three display sites needed zero code changes** — they
  automatically read real data the moment a row exists.
- New `POST /api/reservation-products` (`src/app/api/reservation-products/route.ts`): creates a row
  with `added_by_employee_id` from the authenticated caller and `added_by_role` from the request
  body (`'doctor_session'` | `'receptionist'` — the server can't infer which UI surface is calling).
  If the target reservation is already `completed` with an issued invoice, appends directly to that
  invoice's `invoice_lines` immediately (mirrors `appendPaymentToExistingInvoice`'s late-payment
  pattern) rather than leaving the row stranded with no future completion event to pick it up.
- `writeCheckoutInvoice()` now also reads `reservation_products WHERE invoiced_at IS NULL` for the
  reservation being completed, builds one `invoice_lines` row per entry via the existing
  `buildInvoiceLine()`, and marks those rows `invoiced_at` after a successful insert.
- Doctor portal (`DoctorAccountView.tsx`): new `persistSessionLineItems()`, called from
  `handleCompleteTreatment` right before the completing PATCH. Writes one row per accumulated
  product/additional-service/pulse-usage entry. Non-fatal on failure — logged, doesn't block
  completing the session, since the pre-existing `amountLeft`/`notes` PATCH remains the number that
  actually matters to the patient's balance regardless of whether this new path succeeds.
- Reception drawer (`admin/page.tsx`'s `handleAddProductToViewingBooking`): now also POSTs a real
  row immediately (real-time, not batched) alongside the pre-existing `notes` append and
  `amountLeft` recalculation — neither of which was removed.
- The `notes`-text summaries (both sides) and the three display sites' `notes`-regex fallbacks are
  **unchanged, kept as the legacy-data path** — exactly per the "no backfill" trade-off above.
- Verified: `tsc --noEmit` 0 errors, `eslint` 0 errors (no new warnings), `vitest run` 107/107
  passing. **Not yet verified live** — the migration has not been applied to the dev database in
  this session (no Supabase project access from this environment); every write path 500s until it
  is applied and the flow is exercised in the browser end-to-end.

---

## DEC-043: Admin Panel Arabic — Reception-First Scope, Admin-Local Language State, Western Digits, Prove-The-Pattern-Then-Reception Extraction Order

**Date:** 2026-08-17
**Status:** Decided — active. Resolves the 4 open decisions listed at the bottom of
`ai_docs/ADMIN_REFACTOR_AND_I18N_PLAN.md`, unblocking that plan's Phase 1.

**Context:**
`ADMIN_REFACTOR_AND_I18N_PLAN.md` (written 2026-08-17 by Windsurf after the RISK-038…050 audit)
established that Arabic cannot be added directly to `src/app/admin/page.tsx` (27,733 lines, ~860
hardcoded strings, 606 `useState` calls) — it must be extracted into components first (Phase 1),
then translated per-component (Phase 2), the same pattern already proven (partially — see the
correction below) by the Doctor Portal. Phase 0 (Vitest + 107 tests, `npm run test` wired into
`npm run check`) completed the same day. Phase 1 was blocked on 4 open questions the plan explicitly
left for the owner. This entry answers them, reached in conversation on 2026-08-17.

**Correction to the plan's own framing, found while answering these questions:** the plan cites
`DoctorAccountView.tsx`'s `doctorTranslations[lang]` pattern as proof the extract-then-translate
approach works. Verified live during the same day's RISK-053…057 testing and by direct grep: the
dictionary is real and fully mirrored (206 keys `en`, 206 `ar`), but only **2 of 10** doctor
components (`DoctorSidebar`, `DoctorScheduleTab`) actually consume it — the screens exercised live
today (Ongoing Session, Complete Treatment, Products) render 100% hardcoded English despite the
portal's own "English View / العرض بالعربية" toggle existing. The pattern is proven at the level of
*"split the file, then translation becomes tractable"* — not yet at *"every split component is
actually translated."* Phase 2 for the admin panel must budget for finishing each component's
translation, not just extracting it.

**Decisions:**

1. **Arabic scope: Reception-first**, not the whole admin panel. Bookings, Patients, POS, New
   Booking — matching the plan's own "much shorter path to real value" framing. The remaining ~45
   sections stay English-only until a future decision extends scope.
2. **Language state: admin-local**, mirroring `DoctorAccountView`'s own `lang` state — not the
   shared public-site `LanguageContext`. Persisted to `localStorage` under `CLIENT.storagePrefix`.
   Matches the plan's own recommendation, taken as-is: staff language preference is a different
   concern from a public visitor's, and `LanguageContext` carries a known, still-unfixed SSR/CSR
   hydration mismatch (from the `/book` work) this phase should not inherit.
3. **Money stays in Western digits** in Arabic mode, matching the plan's own recommendation —
   avoids accounting confusion between the two numeral systems on the same screen.
4. **Extraction order: prove the pattern on one simple section first, then go straight to Reception
   — not the plan's full Wave 1→6 sequence.** The plan's suggested wave order deliberately puts
   Bookings/Patients/POS **last** (Wave 5 "largest PII surface, do after the pattern is proven",
   Wave 6 "most entangled, do last") — reasonable when the goal is derisking the whole file, but in
   direct tension with Reception-first Arabic: that scope means extracting exactly the sections the
   plan calls riskiest, first. Resolved by keeping the plan's safety instinct (prove the mechanical
   extraction process on something low-stakes before touching PII/entangled screens) while dropping
   its unrelated sections: **one Wave 1 section (Settings group — small, form-heavy, few
   cross-dependencies) as the pattern-proving PR, then directly into the Reception sections
   (Bookings, Patients, POS, New Booking) needed for the chosen scope** — not Wave 1's full Settings
   list, and not Waves 2–4 (Config/People/Catalog) at all, since they serve sections outside the
   chosen Arabic scope.

**Reason:**
- Reception-first was the user's explicit call, matching the plan's own stated rationale for that
  option.
- Keeping one low-stakes proof section before Reception preserves the actual reason Wave ordering
  existed — confidence that the mechanical extract-and-test loop works — without committing to
  extracting ~15 sections (Waves 1–4 in full) that don't serve the chosen scope and would delay
  Reception Arabic for no benefit under this narrower goal.
- Surfacing the Doctor Portal's real (partial) translation coverage now, rather than letting Phase 2
  planning assume it's a finished reference implementation, avoids under-scoping Phase 2's effort.

**Trade-offs:**
- Settings, Config, People, and Catalog sections (Waves 1 remainder, 2, 3, 4) stay both un-extracted
  and English-only under this decision — revisiting Arabic scope later means resuming the plan's
  original wave order for whatever wasn't covered by Reception-first.
- The single pattern-proving section still needs picking and briefing before Phase 1 can start in
  earnest — this decision authorizes the approach, not a specific section; that choice belongs to
  whoever writes the next Windsurf brief.
- No change to Phase 0's already-completed test suite; those 107 tests remain the safety net for
  whichever sections Phase 1 now touches first.

**Correction 2026-08-19 — Reception scope widens to include Doctors and Services (read-only), per
Mohamed: "لا ال Doctors و Services و ال Inventory من ضمن ال Scope لان الريسيبشن مش بيعدل بس بيشوف ال
Info بتاعهم على الاقل" (Doctors, Services, and Inventory ARE in scope — Reception doesn't edit them,
but at least views their info).** Checked against the actual repo before recording this:

- **Doctors** (`page.tsx:7711-8372`, ~661 lines) and **Services** (`page.tsx:8375-9370`, ~995 lines)
  are still fully inline, not extracted. Both already gate their write actions behind `hasPermission`
  checks (`providers.edit`/`providers.delete` for Doctors; `services.create`/`.edit`/`.delete` for
  Services) — so a Reception role without those specific permissions already gets a read-only
  experience today, enforced at the code level, not just by convention. Extracting and translating
  either section grants Reception no new capability; it only makes their existing read-only view
  correctly render in Arabic. **Both added to Reception scope**, same extract-then-translate order
  as the Patients/Bookings work.
- **Inventory** (`page.tsx:14724-15608`, ~885 lines) is different in kind, not just size: it has
  **zero** `hasPermission` checks anywhere in the block. Sidebar visibility is gated (only
  `admin`/`HR` roles, or anyone whose granted permissions include an `inventory.*` prefix, see the
  nav item at all — see `permittedSidebarItems` at `page.tsx:869`), but once inside, there is
  currently no internal read/write boundary — any role that can reach the screen has full
  create/edit/delete. If Reception is meant to be view-only here, that is not enforced today; it
  would need real gating work first, which is a separate task from extraction/translation and out
  of a mechanical Windsurf brief's scope. **Deliberately held pending** — Mohamed has not yet decided
  what Reception's actual Inventory access should be, and extracting/translating a screen whose
  permission model might still change would need redoing.
- Not yet written: the actual Windsurf briefs for Doctors/Services extraction — this correction only
  records the scope decision and the investigation behind it.

**Correction 2026-08-19 (second) — Inventory added to scope too, with a precondition, per Mohamed:
"اعتبرها لل admin و نزود ال Permissions بنفس الطريقة اللي موجوده في ال Settings, Role Management"
(treat it as admin's by default, and add the Permissions the same way Settings/Role Management
already does).** Investigated before writing the brief: the 4 permission keys this needs
(`inventory.view`, `.manage_devices`, `.manage_products`, `.manage_suppliers`) **already exist** in
`PERMISSION_STRUCTURE` (`page.tsx:439-447`) — assignable to any role today via Role Management. The
gap is not the permission system, it's that nothing in the ~1,700-line Inventory screen (main
block, its two adjacent modals, a far-away Device Audit Logs modal, and the already-extracted
`SupplierManagementScreen.tsx`) ever calls `hasPermission` on them — confirmed by grep, zero
references outside the declaration. Any role reaching the nav item today has full unguarded
create/edit/delete.

**Decision, confirmed with Mohamed before writing Brief 17:** wire the existing 4 keys into real
`hasPermission` checks on every write action (mirroring exactly how Services already gates
`services.create`/`.edit`/`.delete`), as its own commit landing *before* any structural extraction.
Nav-level access stays unchanged (`admin`/`HR` roles see Inventory automatically, per
`permittedSidebarItems` at `page.tsx:869` — not touched by this brief). Reception will be granted
`inventory.view` separately, once the enforcement exists, giving them the same read-only experience
Doctors/Services already provide. Extraction (Brief 17 Part 2) follows only after Part 1 lands and
is verified — doing it in the other order would have meant extracting a screen whose permission
model was still an open question, needing a redo.

Brief 17 written and queued (`WINDSURF_BRIEFS.md`), covering both parts.

---

### DEC-025: Doctor Profile Details View in Admin Doctors Tab

**Date:** 2026-08-04  
**Status:** Approved & Implemented  
**Scope:** `src/components/admin/doctor/DoctorProfileDetailsView.tsx`, `src/app/admin/page.tsx`

**Context:**  
The Admin Doctors section previously listed doctors with edit/delete actions, but lacked a dedicated comprehensive detail view for reviewing a doctor's profile, contact details, work schedule, assigned branches, financial summary metrics, completed visits, and patient history without opening full inline edit mode.

**Decision:**  
1. Built `DoctorProfileDetailsView` with a multi-tab design:
   - Header with doctor metadata, status badge, action buttons (Print Profile, Back).
   - Metrics cards: Total Patients, Completed Sessions, Attendance Rate, Rating.
   - Profile Details side panel: Contact info, work schedule, assigned services, assigned branches.
   - Primary interactive tabs:
     - **Patient Visits & Appointments**: Filterable visit log (Today, This Week, This Month, Custom Date Range), search bar by patient name/phone, pagination, and single-click view modal for full visit drawer details (clinical notes, session type, branch).
     - **Performance & Analytics**: Summary cards and performance distribution breakdown.
     - **Export & Reports**: CSV report generation with custom date range selection and download.
2. Added an **Info** (`<Info size={15} />`) action button next to Delete/Edit buttons in the Doctors table row in `src/app/admin/page.tsx`.
3. Added system test suite integration for doctor profile detail view diagnostics.

---

## DEC-044: Public Site's SSR Language Fix (Brief 29) Accepted With Its Dynamic-Rendering Cost — Static-Preserving Rewrite Deferred

**Date:** 2026-08-23
**Status:** Superseded same day by Brief 30 (`b5e5988`) — see closing note at the bottom. Kept as the
record of why the interim `cookies()` approach was accepted at all, and as the spec Brief 30 was
verified against.

**Context:**
Brief 29 fixed a real bug: the public site always server-rendered `<html lang="en">` with no `dir`
attribute (`src/app/layout.tsx`), because `LanguageContext.tsx`'s `getInitialLanguage()` returns
`"en"` unconditionally whenever `window` is undefined (i.e. every SSR pass), and the real
preference was only ever applied client-side inside a `useEffect`. Every fresh load/refresh in
Arabic flashed LTR first, then snapped to RTL once React hydrated — the `suppressHydrationWarning`
on `<html>`/`<body>` existed specifically to hide the console warning this caused.

The fix landed (commit `9420b1b`): `LanguageContext.tsx` now also writes a `cr-language` cookie;
`layout.tsx` became an `async` Server Component that reads it via `cookies()` and renders the
correct `lang`/`dir` from the first byte. Verified independently: `tsc`/`eslint` clean, `vitest`
unaffected, build succeeds — and the fix genuinely works.

**The cost, found during review, not by Windsurf:** calling `cookies()` inside a Server Component
forces Next.js to treat that render as **per-request dynamic**, not statically generated. Confirmed
directly in the production build's route table: `/`, `/about`, `/services`, `/contact`, `/book`,
and `/profile` all shifted from `○` (static, prerendered, CDN-cacheable) to `ƒ` (dynamic,
server-rendered on every request). This is not an implementation shortcoming — there is no way to
vary static HTML per visitor's cookie without either dynamic rendering or a locale-prefixed routing
rewrite (see rejected option below) — but it is a real hosting-cost/latency change to the entire
public marketing site that was not part of the original bug report.

**Chosen Option:** Accept the current `cookies()`-based fix as-is for now — it is correct, tested,
and already shipped. **Defer, don't implement yet**, a static-preserving alternative: a small
synchronous (non-`async`/`defer`) inline `<script>` as the first thing in `<head>`, reading the
`cr-language` cookie directly (`document.cookie`, available before any paint) and setting
`document.documentElement.lang`/`dir` before the browser renders anything — the same
prevent-flash-of-wrong-theme pattern used by dark-mode libraries like `next-themes`. Paired with
changing `globals.css`'s `body.rtl { direction: rtl; text-align: right; }` (line ~100) to an
`html[dir="rtl"]` attribute selector, so the correction doesn't depend on `document.body` existing
yet when the head script runs. This removes the flash **without** `cookies()`/dynamic rendering —
`layout.tsx` goes back to a plain (non-`async`) component, all six routes return to `○` static.

**Rejected for now:** full locale-prefixed routing (`/en/...`, `/ar/...` as separately
statically-generated routes via `generateStaticParams`, redirected by Edge Middleware based on the
cookie/`Accept-Language`) — the textbook, most scalable Next.js i18n pattern, but a large rewrite
touching every internal link, canonical URL, and sitemap entry on the public site. Disproportionate
to the scope of the bug that started this (a visual flash), revisit only if the site's i18n needs
grow well beyond a single-language-toggle marketing site.

**Reason for accepting the cost now instead of blocking on the rewrite:** Mohamed's call, given the
fix is already shipped, tested, and correct — swapping it for the static-preserving version is a
small, self-contained follow-up (two files: `layout.tsx`, `globals.css`) with zero risk to ship
later, not a reason to hold the working fix. Revisit as its own brief.

**Trade-offs accepted in the interim:** every public marketing page view now invokes a server
function instead of serving from Vercel's CDN edge cache — higher latency per request and
compute-time cost proportional to traffic. For a clinic marketing site (not high-traffic
e-commerce), judged acceptable short-term; **not** judged acceptable as the permanent architecture,
hence this decision explicitly flags it for a follow-up rather than closing the topic.

**Closing note, 2026-08-23 (same day):** Brief 30 (`b5e5988`) landed the deferred static-preserving
fix exactly as specified — `layout.tsx` reverted to a plain (non-`async`) component, `cookies()`
removed, replaced with a synchronous inline `<script>` in a literal `<head>` that reads
`cr-language` from `document.cookie` and sets `documentElement.lang`/`dir` before paint;
`globals.css` gained an `html[dir="rtl"]` selector alongside the existing `body.rtl` one so the
correction applies immediately without waiting on `<body>`'s class. Independently re-verified:
`tsc`/`eslint`/`vitest` clean; production build confirms `/`, `/about`, `/contact`, `/services`,
`/profile`, `/blog` are all back to `○` (static, prerendered) — `/book` stays dynamic, but for an
unrelated, pre-existing reason (it reads `searchParams`, which forces dynamic rendering on its own,
independent of anything in this fix); inspected the actual prerendered `index.html` output directly
and confirmed the script is present in the static HTML alongside the `metadata`-generated `<title>`
— the two coexist correctly. This decision is now fully closed — no outstanding cost, no deferred
work remaining.

---

## DEC-045: Doctor Active Status Lives Only On `providers.active`, Not Synced To `employee_accounts`

**Date:** 2026-08-27
**Status:** Decided and implemented, as part of the RISK-075 fix.

**Context:**
The new Doctor Status feature (`DoctorStatusModal`, `PATCH /api/providers`) was found, during a
code review, to be writing `active` to two tables: `providers` (the field the Doctors screen and
doctor profile actually display) and `employee_accounts` (via a name-matched sync intended to also
flip the doctor's login/employee record). Neither column existed in any migration — `providers`
needed one added (see RISK-075); `employee_accounts.active` had been an unconfirmed, never-created
column referenced only in stale doc text since before this session (`DB_SCHEMA.md`'s prior note on
it).

**Question:** now that `providers.active` is being properly added via a real migration, should
`employee_accounts.active` also get a real migration, so "deactivate this doctor" also disables
their login?

**Investigation:** grepped every auth-relevant call site — `src/app/api/employees/route.ts`,
`src/lib/access.ts`, and every login/session route — for any read of `employee_accounts.active`.
None exists. The feature's own translated copy (`src/components/admin/translations.ts`,
`doctorStatusDescription` keys) describes the consequence as *"Inactive doctors cannot receive new
bookings"* — nothing about login access. Adding the column and the sync would have created a second
boolean with no reader, doing nothing while looking like it does something.

**Chosen Option:** `providers.active` is the only status column. The `employee_accounts` sync in
`PATCH /api/providers` was removed rather than fixed forward. `DB_SCHEMA.md`'s existing note on
`employee_accounts.active` was updated to record this as a deliberate decision, not just an
unconfirmed gap, so a future pass doesn't re-add it speculatively.

**Rejected:** adding `employee_accounts.active` now "for consistency" or "to be safe." Rejected
because it would be dead weight (nothing reads it) and because a real "deactivate this employee's
login" feature is a materially different piece of work — it needs to hook into the actual auth
check path (`src/lib/access.ts` / the Supabase Auth session, not just a database flag), which this
fix's scope did not include.

**Consequence / known gap:** deactivating a doctor today does **not** revoke their ability to log
into the admin panel — it only removes them from new-booking eligibility (and even that isn't fully
wired yet, see RISK-075's "not done in this pass" note on `GET /api/availability`). If a real
account-suspension feature is needed later, design it fresh against the auth call sites rather than
assuming this flag can be repurposed.

---

## DEC-046: Add Previous / Historical Booking Intake Engine and System Test Suite Diagnostics

**Date:** 2026-08-29
**Status:** Decided & Implemented

**Context:**
Receptionists and Clinic Admins need to manually record historical bookings that took place before the clinic adopted Revera Clinics. Previously, the system only allowed creating new upcoming appointments via `AdminNewBookingView`, which enforces future slot availability, doctor shift checks, and creates active appointments that block rooms/doctors.

**Decision:**
1. Built a dedicated `AdminAddPreviousBookingView` component accessible via the 3-dots action menu beside `+ New Booking` in `AdminBookingsView`.
2. Created backend endpoint `POST /api/reservations/previous`:
   - Validates required fields (`patientPhone`, `patientName`, `date`).
   - Validates Egyptian and international phone numbers.
   - Performs patient matching on `customers` table by normalized phone: links to existing patient and increments booking count, or automatically provisions a new customer record.
   - Saves historical bookings with `status = 'completed'`, `is_manual = true`, `is_historical = true`, and preserves the historical date without interfering with active schedules or room/doctor availability.
3. Created `GET /api/reservations/previous` and integrated test case `TC-038` into the Admin Settings System Test Suite (`/admin` -> Settings -> System Test Suite).
4. Provided full bilingual localization (EN/AR) in `src/components/admin/translations.ts`.

---

## DEC-047: Master Defect Catalog Remediation & System Verification Suite Expansion

**Date:** 2026-09-05
**Status:** Decided & Implemented

**Context:**
A comprehensive audit documented 28 core defects across User View, Admin View, Doctor View, and Database/API Architecture (`ai_docs/SYSTEM_CORRUPTIONS_AND_AUDIT.md`).

**Decisions & Remediations:**
1. **Availability Engine & Inactive Doctor Filter (`CORRUPT-U01`, `CORRUPT-A08`, `CORRUPT-U02`, `CORRUPT-U03`):**
   - Updated `fetchCachedServices` to select `duration` and `duration_minutes` explicitly.
   - Updated service matching logic to check `selectedSvc.en || selectedSvc.name` with bilingual fallback.
   - Excluded inactive doctors (`provider.active === false || provider.status === 'inactive'`) from slot calculation and provider rosters.
   - Enforced operating hours boundaries for multi-slot services so slots exceeding clinic closing times are excluded.
2. **Booking Modal & Egyptian WhatsApp Normalization (`CORRUPT-U02`, `CORRUPT-U05`, `CORRUPT-U07`):**
   - Added service duration cutoff logic (`slotStartMinutes + svcDuration <= endMinutes`).
   - Fixed Egyptian trunk prefix bugs on `wa.me` links (`2001...` -> `201...`, `01...` -> `201...`).
   - Aligned past-slot time comparisons to `Africa/Cairo` timezone.
3. **Patient Auth & Customer Phone Queries (`CORRUPT-U08`, `CORRUPT-U09`):**
   - Added session hydration fallback in `/profile` when `localStorage` is missing.
   - Added `normalizeEgyptMobile` and multi-prefix variant querying (`010...`, `+2010...`, `2010...`, `002010...`) in `GET /api/customers`.
4. **Admin Bookings Real Status & Category Localization (`CORRUPT-A02`, `CORRUPT-A09`):**
   - Preserved `status: r.status || st` alongside `display_status: st` in `AdminBookingsView`.
   - Added Arabic category name input to `AdminServicesView` category modal, saving `ar: newCategoryNameAr.trim()` (resolves `RISK-064`).
5. **Reception Geofence Guard (`CORRUPT-A11`):**
   - Ensured `POST /api/reception/dashboard` Start Shift rejects with 400 `out_of_location` when branch coordinates are resolved and distance exceeds 800m.
6. **Doctor Intake Matching & Prescription Deduplication (`CORRUPT-D02`, `CORRUPT-D04`, `CORRUPT-D06`):**
   - Enhanced medical intake template service matching across `s.en`, `s.ar`, `s.name_en`, `s.name_ar`.
   - In `POST /api/prescriptions`, when `booking_id` is provided without `id`, upserts the existing prescription for that booking rather than creating duplicate rows.
   - Added `doctor_name` selection and fallback matching in `GET /api/hr/doctor-payroll`.
7. **System Test Suite Diagnostic Test Cases:**
   - Registered `TC-040` (Availability Doctor & Inactive Status Filtering), `TC-041` (Prescription Deduplication & Clinical Intake Mapping), and `TC-042` (Reception Shift Location Verification & Geofence Guard) under `/admin` -> Settings -> System Test Suite.

---

## DEC-048: Staff Shift GPS Location Verification Toggle in Settings & Geofence Tolerance Resolution

**Date:** 2026-09-06
**Status:** Decided & Implemented

**Context:**
Receptionists and staff clock into daily shifts via the Reception Dashboard (`/api/reception/dashboard`). In urban medical buildings and indoor clinics, GPS drift can produce coordinates offset by a few hundred meters. Furthermore, clinic management needed the ability to enable or disable the GPS location check requirement dynamically from Admin Settings (e.g. during technical issues, remote work, or GPS unavailability).

**Decisions & Implementation:**
1. **Admin Settings Toggle:**
   - Added `enableGpsShift` toggle under `/admin` -> Settings -> Booking Settings (`BookingSettingsView.tsx`), with interactive Info explanation popup.
   - Hydrated and saved under `page_settings` payload (`booking.enableGpsShift`), maintaining backward compatibility with `shift.gpsShiftEnabled`.
   - Localized bilingual translations (EN/AR) in `src/components/admin/translations.ts`.
2. **Reception Dashboard Dynamic GPS Handling:**
   - `GET /api/reception/dashboard` returns `gpsShiftEnabled` in shift metadata.
   - `ReceptionDashboardView.tsx`: If `gpsShiftEnabled === false`, completely bypasses browser geolocation prompts and starts shift immediately.
   - `POST /api/reception/dashboard` (`start_shift` action): If `gpsShiftEnabled === false`, skips all location checks and records attendance.
   - If `gpsShiftEnabled === true`, validates coordinates against assigned branch and all active clinic branches with a 1000m tolerance threshold.
3. **Geofence Coordinate Parser & Fallbacks (`src/lib/geo.ts`):**
   - Expanded Google Maps regex to decode embed, place pin, query, center, and coordinate URLs (`!2d`, `!3d`, `!4d`, `@lat,lng`, `q=lat,lng`, `place/lat,lng`, `daddr`, `ll`).
   - Added known clinic branch coordinate fallbacks (Sheikh Zayed: `30.0131, 30.9876`, New Cairo: `30.0263, 31.4913`, Heliopolis, Maadi, Alexandria) if external maps link is missing or unresolvable.
4. **Diagnostic Verification:**
   - Added test case `TC-043` (`Staff Shift & GPS Geofence Settings Engine`) to `/admin` -> Settings -> System Test Suite.

---

## DEC-049: Relocate GPS Shift Verification to Inactivity Settings & Error Resolution Hardening

**Date:** 2026-09-06
**Status:** Decided & Implemented

**Context:**
The GPS Location Check for shifts is an attendance, staff tracking, and inactivity/presence control rather than a booking rule. Placing it under Booking Settings was unintuitive. Additionally, non-geofence errors during shift start were previously misattributed to "out of location" due to a catch-all translation fallback on `generic`.

**Decisions & Implementation:**
1. **Relocated Setting UI to Inactivity Settings:**
   - Moved `enableGpsShift` control from `BookingSettingsView.tsx` to `InactivitySettingsView.tsx` (`/admin` -> Settings -> Inactivity Settings).
   - Designed a dedicated card with modern toggle switch, Info dialog modal (`setActiveInfoFeature`), and dual-status visual cards (Geofencing Active vs Location Bypass Active).
   - Saved and hydrated `enableGpsShift` under `inactivity` object in `page_settings` (`inactivity.enableGpsShift`), while maintaining fallback resolution across legacy `booking.enableGpsShift` and `shift.gpsShiftEnabled`.
2. **Shift Start Error Resolution & Localization:**
   - Fixed `ReceptionDashboardView.tsx` so literal server error messages (`result.error` / `result.message`) are accurately surfaced rather than blindly overridden with a location error string.
   - Updated `generic` error copy in `translations.ts` (EN & AR) to clearly indicate a general system/network issue rather than a false "You must be in a working location" message.
   - Added specific translation strings for `position_unavailable` and `timeout`.

---

## DEC-050: Fix Availability Schedule Resolution for Unconfigured Doctors & General Services

**Date:** 2026-09-06
**Status:** Decided & Implemented

**Context:**
In the website booking date picker (`MaterialDatePicker.tsx` & `BookingModal.tsx`), weekdays (Monday through Saturday) were incorrectly grayed out and closed.

**Root Cause:**
In `src/app/api/availability/route.ts`:
1. When doctor `working_days_hours` was `null` (default in DB), `getDoctorDayConfig` returned `null`, causing the slot loop to treat active doctors as closed on all weekdays.
2. Services without explicit doctor service tags in `providers.services` evaluated `activeCompProviders.length === 0`, which triggered a premature `isAvailable: false` on all days.
3. Fallback service hours cache read a legacy page settings footer entry where Thursday was marked closed.

**Decisions & Implementation:**
1. **Inherit Clinic Hours for Unconfigured Doctors:**
   - `getDoctorDayConfig` now defaults to the clinic's operating hours (`{ isOpen: true, start: clinicStart, end: clinicEnd }`) when a doctor's custom `working_days_hours` is not explicitly configured in the database.
2. **General Service Availability Fallback:**
   - When no specific provider is restricted to a service (`activeCompProviders.length === 0`), availability evaluates against clinical room capacity and clinic operating hours.

---

## DEC-051: Multi-Shift Daily Start/End Cycle & Cumulative Interval Tracking

**Date:** 2026-09-06
**Status:** Decided & Implemented

**Context:**
Clinic receptionists and staff may have split shifts, mid-day breaks, or need to close and reopen their working shift multiple times within the same calendar day. Previously, `POST /api/reception/dashboard` with `start_shift` rejected any second start with a 409 conflict ("Today's shift has already ended and cannot be restarted").

**Decisions & Implementation:**
1. **Support Repeated Start/End Shift Actions in Same Day:**
   - Removed the single-shift restriction on `start_shift`. Employees can now start, end, and restart their shifts multiple times per day.
   - When restarting an ended shift, the system preserves the initial check-in timestamp (`actualStartingTime`) for daily reference and appends a new interval to `notes` (`[{ start: t1, end: t2 }, { start: t3, end: null }]`), clearing `check_out_time` to signify an active session.
2. **Cumulative Elapsed Time & Work Hours:**
   - On shift end (`end_shift`), the active interval is closed, and total daily duration across all closed intervals is summed into `work_hours` (e.g., `(t2-t1) + (t4-t3)`), ignoring break gaps.
   - `GET /api/reception/dashboard` calculates cumulative elapsed seconds (`pastSessionsSeconds + liveActiveSessionSeconds`) ensuring 100% accurate time reporting without including time spent off-shift.
3. **Live UI Synchronization in ReceptionDashboardView:**
   - Updated the live timer in `ReceptionDashboardView.tsx` to compute elapsed time using `pastSessionsSeconds` plus the current sub-shift elapsed time.
   - Updated modal prompt copy dynamically: when a shift was previously ended, the modal indicates resuming/starting a new shift session.
4. **Diagnostic Verification:**
   - Added test case `TC-044` (`Multi-Shift Daily Cycle & Interval Tracking Engine`) to `/admin` -> Settings -> System Test Suite.

---

## DEC-052: Role Lock Is Row Data, Toggled Only By A Superadmin

**Date:** 2026-09-10
**Status:** Decided — active

**Context:**
"System Locked" was a hardcoded array, `['superadmin','admin','doctor','receptionist','reception']`,
duplicated in two files: the `DELETE` guard in `src/app/api/roles/route.ts` and the badge in
`src/components/admin/settings/RoleManagementView.tsx`. Two problems followed from that. The two
copies could drift, so the badge could claim a role was protected while the API happily deleted it
(or the reverse). And a clinic could not protect a role it had created itself — only those five
names were ever safe, and a fork whose roles are named differently got no protection at all.

The lock was also weaker than its label implied: it was checked only on `DELETE`. `POST` had no
check, so `admin` could be stripped to zero permissions while still being undeletable.

**Alternatives Considered:**
- Keep the hardcoded list, extract it to one shared constant imported by both files
- Move the lock into the `roles` row as a `locked` column, editable through the API

**Chosen Option:** `roles.locked` boolean, toggled by `PATCH /api/roles`, superadmin only.

**Reason:**
- A shared constant fixes the drift but not the real limitation — clinics still can't lock their own
  roles, and every fork inherits Revera's five names (contradicts the generic-product goal).
- Toggling is restricted to superadmin rather than administrator, which is the level the rest of the
  file uses. Deciding what an admin may no longer touch is exactly the call an admin should not be
  able to make for itself; an admin who could unlock a role could hand itself anything.
- Locking now freezes **both** permission edits and deletion. A lock that still allowed permission
  edits protects very little.

**Trade-offs:**
- Makes the lock toggleable, which introduces a lockout path that did not exist before: unlock
  `superadmin`, delete it, and nobody can reach Role Management to undo it. Mitigated by
  `UNDELETABLE_ROLES = ['superadmin','admin']` — the API refuses to unlock or delete those two
  regardless of the column, and the UI hides the toggle for them. The column is honoured for every
  other role, including a clinic's own.
- `doctor`, `receptionist` and `reception` are no longer permanently protected: they are backfilled
  to `locked = true` by the migration, but a superadmin can now unlock and delete them. That is the
  intended new capability, not a regression — a clinic that does not use a `doctor` role should be
  able to remove it.

**Impact on Codebase:**
`supabase/migrations/20260910000000_add_locked_to_roles.sql` adds the column and backfills the five
legacy names. Both former copies of the hardcoded array are gone.
**Manual test checklist:** `ai_docs/manual_tests/ROLE_LOCK_UNLOCK_MANUAL_TESTS.md`

---

## DEC-053: Dynamic Reception Dashboard Shift States & Live Performance/Payment Settlement

**Date:** 2026-09-12
**Status:** Decided & Implemented

**Context:**
The clinic reception dashboard required dynamic responsiveness to shift state (Not Started, In Progress, Completed), live timers, operational actions, pending warnings, and real end-of-shift reconciliation with zero fake data.

**Decisions & Implementation:**
1. **Dynamic Shift State Architecture:**
   - Designed a single unified dashboard component (`ReceptionDashboardView.tsx`) dynamically morphing across State 1 (Start of Day), State 2 (During Day), and State 3 (End of Day).
   - In State 1 & 2: Renders Today's Overview cards (`Today's Bookings`, `Pending Approval`, `Expected Payments`), Quick Actions (`+ New Booking`, `+ New Patient`), Attention Needed alerts, and Today's Bookings table with 3-dots actions dropdown (`View Booking Details`, `View Transactions`, `Pending Approvals`).
   - In State 3: Switches to End of Day review displaying total worked duration, Today's Performance (Completed, Cancelled, No-Shows), and Payments Received breakdown.
2. **Real Database Aggregation & Zero Fake Data:**
   - Replaced all static estimates with live queries against Supabase tables (`hr_attendance`, `reservations`, `transactions`, `payments`, `employee_accounts`, `providers`, `services`).
   - Payment method breakdown aggregates real transactions and receipts across Cash, InstaPay, Visa/Card, and Wallet balances without double counting.
3. **End Shift Confirmation Dialog:**
   - Displays live summary, performance breakdown, payments received by payment method, and a yellow warning banner for uncompleted bookings before confirming shift termination.
4. **Bilingual Parity (EN/AR):**
   - Full localization under `adminTranslations[lang].reception.dashboard` supporting RTL and LTR viewports.
5. **System Test Verification:**
   - Added test suite `TC-050` (`Reception Dashboard Shift State & Performance Metrics Engine`) to the diagnostic test suite.

---

## DEC-054: Unified Staff Login Portal (`/login`) & Shaded Customer Login Navigation Dropdown

**Date:** 2026-09-12
**Status:** Decided & Implemented

**Context:**
1. When deactivating customer login from Admin Settings -> Pages Settings -> Home, users requested that the customer login option remain visible but shaded/grayed out rather than removed entirely, ensuring consistent layout and clear affordance.
2. Changes to settings needed to reflect instantly in open tabs and customer view without requiring page reloads.
3. The public navigation login trigger required a dropdown providing two distinct entry points: Patient/Customer Login and Clinic Staff & Doctors Login.
4. All clinic staff needed a single unified login portal at `/login` that automatically routes them to their authorized role portal (`/admin`, `/doctor`, `/reception`, `/superadmin`, or `/<role-slug>`).

**Decisions & Implementation:**
1. **Shaded Customer Login Preservation:**
   - Updated `Navbar.tsx` (desktop and mobile) so that when `showCustomerLogin === false`, the Customer Login option is rendered with `opacity-50`, disabled cursor, and an informative "Deactivated" / "معطل" badge instead of disappearing.
2. **Instant Multi-Channel Real-Time Sync:**
   - Enhanced `HomePageSettingsView.tsx` with 3-tier real-time broadcast:
     - Custom DOM Event: `window.dispatchEvent(new CustomEvent("revera-settings-change", { detail: { showCustomerLogin } }))`
     - Broadcast Channel: `new BroadcastChannel("revera_channel").postMessage(...)`
     - LocalStorage Sync: `localStorage.setItem("revera_settings_sync", ...)`
   - `Navbar.tsx` registers event, broadcast, and storage listeners with fallback focus checks, updating the navigation state in real time across all open tabs.
3. **Public Navigation Login Dropdown:**
   - Replaced single login button with an elegant luxury dropdown:
     - **Option 1**: Patient & Customer Login (opens auth modal/profile, shaded when disabled).
     - **Option 2**: Clinic Staff & Doctors (links directly to `/login`).
4. **Unified Staff Login Portal (`src/app/login/page.tsx`):**
   - Implemented a branded login portal at `/login` accepting Email or Employee ID (`REV-XXXX`).
   - Customer account guard blocks patient emails from accessing staff portals.
   - On successful authentication, inspects user role via `/api/auth/me`, sets session indicator, and auto-routes staff to `/${getRoleSlug(role)}` (e.g. `/doctor`, `/reception`, `/admin`).
   - Automatically detects existing valid staff sessions and forwards directly to their workspace.
5. **System Test Suite Integration:**
   - Added `TC-051` (`Unified Staff Login & Customer Dropdown Real-Time Sync Engine`) to `INITIAL_SYSTEM_TEST_SUITES`.

---

## DEC-055: Strict Floating WhatsApp Button Staff/Admin Isolation & Dashboard Date Timezone Alignment

**Date:** 2026-09-12
**Status:** Decided & Implemented

**Context:**
1. The floating WhatsApp customer contact widget was inadvertently rendering on role-based staff routes (`/doctor`, `/reception`, `/superadmin`, `/login`, etc.) when only `/admin` was explicitly suppressed in the legacy check.
2. Reception Dashboard was showing "No bookings scheduled for today" when bookings existed for today due to UTC timezone truncation (`toISOString().split('T')[0]`), which lagged behind local Egypt time (`Africa/Cairo`, UTC+2/UTC+3) after midnight.

**Decisions & Implementation:**
1. **Strict Customer-Only Page Allowlist for WhatsApp Floating Button:**
   - Updated `src/components/WhatsappButton.tsx` to strictly allow rendering only on public customer marketing routes (`/`, `/about`, `/services`, `/contact`, `/book`, `/blog`, `/terms`, `/profile`).
   - Suppressed completely for `/login`, `/admin`, `/doctor`, `/reception`, `/superadmin`, `/hr`, `/auth/*`, any active staff session (`revera_admin_session_active`), or when `.admin-view` / `#admin-root` is present in the DOM.
2. **Timezone-Aligned Date Matching for Today's Bookings:**
   - Updated `/api/reception/dashboard/route.ts` to compute local Egypt date (`toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })`) alongside UTC and query with `.in("date", dateCandidates)` to eliminate timezone discrepancies.
   - Updated `ReceptionDashboardView.tsx` to pass the local client date parameter (`?date=YYYY-MM-DD`), listen to booking updates, and bind props fallback (`todayReservations={allReservations}`).

---

## DEC-056: Exclusive Staff Authentication via `/login` and Universal Logout Redirection

**Date:** 2026-09-12
**Status:** Decided & Implemented

**Context:**
1. All clinic staff (doctors, receptionists, HR, admins, superadmins) must authenticate strictly through the unified `/login` portal.
2. Logging out from any staff screen or dashboard must consistently redirect back to `/login`.
3. Embedded login forms on staff sub-paths (`/admin`, `/[role]`, etc.) are eliminated in favor of automatic forward redirection to `/login`.

**Decisions & Implementation:**
1. **Universal Staff Logout Redirect to `/login`:**
   - Updated `handleLogout` across all dashboards, sidebars, and views (`admin/page.tsx`, `DoctorSidebar.tsx`, `DoctorAccountView.tsx`, etc.) to clear `sessionStorage` (`revera_admin_session_active`), invoke `triggerCheckout()` + `supabase.auth.signOut()`, and immediately redirect to `/login`.
2. **Session Guard & Unauthenticated Forwarding:**
   - When an unauthenticated user or stale session accesses `/admin` or `/[role]`, `AdminPage` automatically clears stale flags and redirects to `/login`.
   - Inactivity timeout (1 hour) and portal mismatch guards route directly to `/login`.
3. **Customer Auth Modal Isolation:**
   - `AuthModal.tsx` blocks any staff email attempting customer authentication and notifies them to log in via `/login`.

---

## DEC-057: Zero-Reload Real-Time Follow-Up Reminders Engine & Event Bus Synchronization

**Date:** 2026-09-17
**Status:** Decided & Implemented

**Context:**
1. When doctors or receptionists save prescriptions or set follow-up dates (e.g. from the Customer Profile Drawer, Doctor Session View, or Booking Details Modal), the follow-up reminder banners and calendar dots in Reception Bookings previously required a full browser reload to appear.
2. `PATCH /api/reservations` was rejecting standalone `followUpDate` sync requests with `400 Bad Request: Unknown action` when action was omitted.
3. Supabase Realtime WebSocket connections can intermittently disconnect or delay updates.

**Decisions & Implementation:**
1. **Multi-Channel Real-Time Event Bus:**
   - Dispatched `revera-prescription-change` and `revera-booking-change` custom DOM events across all modification surfaces:
     - `src/components/admin/patients/useCustomerProfile.ts` (`handleSavePrescription`, `handleDeletePrescription`)
     - `src/components/admin/DoctorAccountView.tsx` (`handleCompleteTreatment`, `handleSaveClinicalNote`)
     - `src/components/admin/doctor/tabs/DoctorOngoingSessionTab.tsx` (`handleSavePrescriptionInline`)
     - `src/components/admin/bookings/AdminNewBookingView.tsx` (`handleCreateBooking`)
     - `src/components/admin/bookings/AdminAddPreviousBookingView.tsx` (`handleSubmit`)
     - `src/components/admin/bookings/BookingDetailsModal.tsx` (`handleFinalizeTreatmentSession`, etc.)
     - `src/app/admin/page.tsx` (postpone and reschedule handlers)
2. **Resilient 3-Second Background Polling & Subscription:**
   - Added silent background fetching in `AdminBookingsView.tsx` and `DoctorAccountView.tsx` to automatically re-sync reservations and prescriptions in real time without flickering UI spinners or reload prompts.
   - Combined `postgres_changes` subscriptions on `reservations` and `prescriptions` with local event listeners for instant in-tab updates.
3. **API Route Follow-Up Mutation Fix:**
   - Updated `PATCH /api/reservations` to gracefully process direct `followUpDate`, `follow_up_date`, and `follow_up_notes` updates without failing validation.
   - Added automatic synchronization of `follow_up_date` to `reservations` table on every prescription creation in `POST /api/prescriptions`.
4. **Calendar Follow-Up Dot Isolation, Warning Light Blink & Status Color Differentiation:**
   - Rendered calendar warning dots strictly on the actual `followUpDate` rather than lead reminder dates.
   - Refined follow-up calendar dots to match the exact size of standard status indicator dots (`h-1.5 w-1.5 rounded-full`, 6px) without blurry shadows or halo rings, animated on the calendar day cells with a crisp warning light on/off blinking cycle (`.animate-warning-light` keyframe animation), while the legend circle remains solid and steady without turning on and off.
   - Updated the `Postponed` appointment status color across calendar dots, tables, badges, and legend to distinct yellow (`#EAB308`, `bg-yellow-50 text-yellow-800`), completely eliminating color collisions with the indigo Follow-Up Reminder markers.
5. **Interactive Follow-Up Management Action Suite:**
   - Upgraded `+ Convert to Full Booking` on follow-up reminder cards to open an interactive modal (`FollowUpActionModal`) providing 3 explicit choices:
     - (a) **Book on Target Date**: Converts and opens New Booking pre-populated on the doctor's recommended date.
     - (b) **Change Date / Reschedule**: Provides a date picker and action buttons in a clean single-line layout (`[ Date ] [ Reschedule Reminder ] [ Book on New Date ]`) with `whitespace-nowrap` to either book immediately on the new chosen date or save the new follow-up date to the database so the calendar reminder adjusts without text wrapping.
     - (c) **Cancel Follow-Up**: Cancels the follow-up reminder, clears `follow_up_date` in the database across reservations and prescriptions via atomic `PATCH /api/prescriptions` & `PATCH /api/reservations`, and dismisses the reminder with instant real-time event broadcasting.

---

## DEC-058: Modernized Patient Profile Financial Summary Header & Dynamic Staff Shift Schedule Engine

**Date:** 2026-09-18
**Status:** Decided & Implemented

**Context:**
1. In the Patient Profile Drawer (`CustomerProfileDrawer.tsx`), the top header only displayed a basic avatar and name, lacking quick financial visibility when inspecting a patient's file.
2. In Employee Profiles (`UserProfileView.tsx` & `AdminEmployeesView.tsx`), the weekly schedule view previously rendered the fallback 09:00 AM - 05:00 PM schedule for every account because `loadExtraDetails()` encountered Postgres UUID parsing errors on non-UUID identifiers, and shift parser/display templates hardcoded 9-5 hours for non-night shifts.

**Decisions & Implementation:**
1. **Modernized 2-Column Patient Profile Header Card:**
   - Redesigned `CustomerProfileDrawer.tsx` top hero banner into a responsive 2-column layout:
     - **Left Column**: Large rounded avatar with initials/image, bottom-right camera upload overlay button, remove photo button, Patient Full Name, live Active/Inactive account status badge, clickable Phone with icon, and Email with icon.
     - **Center Divider**: Vertical subtle divider (`border-[#414E36]/10`) on desktop viewports.
     - **Right Column (Financial Summary)**: "Financial Summary" heading with 3 distinct soft color-coded metric cards:
       - **Total Spend** (`bg-[#F0FDF4] border-emerald-100`): Wallet icon, label with Info icon, bold amount `{spent} EGP`, subtitle "All time".
       - **Wallet** (`bg-[#F0F9FF] border-sky-100`): Wallet icon, label with Info icon, bold amount `{wallet} EGP` in primary blue, subtitle "Available balance".
       - **Outstanding** (`bg-[#FFF7ED] border-amber-100`): Credit card icon, label with Info icon, bold amount `{outstanding} EGP` in rose/amber, subtitle "Unpaid amount".
    - Added complete English & Arabic translations in `translations.ts`.
2. **Dynamic Staff Shift Schedule & Safe DB Resolution:**
   - Sanitized `loadExtraDetails()` in `UserProfileView.tsx` to guard against invalid UUID syntax errors (`22P02`) when checking `id` vs `employee_id`, `email`, `phone`, and `name`.
   - Enhanced `parseShiftStringToTimes` and `weeklyScheduleData` in `UserProfileView.tsx` to parse custom time ranges (e.g. `02:00 PM to 10:00 PM`, `14:00 - 22:00`, `10:00 AM – 06:00 PM`), morning, evening, night, day shifts, and structured DB weekday schedule trees without falling back to hardcoded 9-5.
   - Replaced hardcoded `t.doctorSection.dayHours` checks in `AdminEmployeesView.tsx` (work tab & print profile) with dynamic formatting helpers (`formatEmployeeDisplayHours`, `formatEmployeeShiftTypeDetails`, `formatEmployeeBreakTime`).
   - Improved `Profile` view employee matching in `src/app/admin/page.tsx` across email, ID, and employee_id.
3. **Automated Diagnostic Test Verification:**
   - Added test case `TC-063` ("Patient Profile Financial Summary & Staff Shifts Resolution Engine") to the Admin Settings System Test Suite (`INITIAL_SYSTEM_TEST_SUITES`).

---

## DEC-059: Receptionist Access to Digital Prescriptions, Medical Reports & Intake Records

**Date:** 2026-09-19
**Status:** Decided & Implemented

**Context:**
Receptionists frequently need to assist doctors and patients at clinic front desks by entering medical intake forms, issuing digital prescriptions based on doctor instructions, uploading lab/medical reports or documents, and viewing previous clinical notes and prescriptions. Previously, the "+ Write Prescription" action button and prescription edit/delete tools in `CustomerProfileDrawer.tsx` were strictly gated to `superadmin`, `admin`, or `doctor` roles only.

**Decisions & Implementation:**
1. **Permission Gating Upgrade in `CustomerProfileDrawer.tsx`:**
   - Updated `+ Write Prescription` button gate on line 913 and empty-state button to allow `adminRole === "receptionist" || adminRole === "reception" || adminRole === "Receptionist"`, alongside permission checks `hasPermission("bookings.manage_prescriptions")` and `hasPermission("clinical.create_prescriptions")`.
   - Updated `isDocUser` (line 1144) to include receptionist roles and permissions, enabling receptionists to edit/delete digital prescriptions and view clinical notes.
2. **Permission Evaluation Engine in `src/app/admin/page.tsx`:**
   - Updated `hasPermission()` `clinical.` permission namespace fallback to grant access for `adminRole === "receptionist" || adminRole === "reception" || adminRole === "Receptionist"`.
3. **Booking Details Modal Fast Prescription Launcher:**
   - Added `+ Add Prescription` button in Card B of `BookingDetailsModal.tsx` when no prescription is recorded yet, opening `setShowDrawerPrescriptionModal(true)` directly.
4. **Automated Diagnostic Test Verification:**
   - Added test case `TC-064` ("Receptionist Clinical Records & Prescription Access Engine") to the Admin Settings System Test Suite (`INITIAL_SYSTEM_TEST_SUITES`).

---

## DEC-060: Customer Package Inspection & Session Redemption in New Booking View

**Date:** 2026-09-19
**Status:** Decided & Implemented

**Context:**
When staff create a new appointment in `AdminNewBookingView.tsx`, they need immediate visibility into whether the selected patient owns active prepaid session packages, which services and remaining sessions are covered, and the ability to pay for the booking using a package session (0 EGP to pay).

**Decisions & Implementation:**
1. **Interactive Package Inspection Card in Appointment Details (Section 2):**
   - Embedded directly in Section 2 (`2 APPOINTMENT DETAILS`) of `AdminNewBookingView.tsx`:
     - Displays patient package state in real time (`loadingPackages`, `noPackagesFound`, or active package cards).
     - Renders package title, expiry date, and total sessions remaining badge.
     - Lists all included services with `{qtyRemaining} / {qtyTotal}` session counts.
     - Highlights the currently selected service and offers 1-click service switching for other covered services in the package.
2. **Session Package Redemption Engine:**
   - When the selected service matches an item with `qtyRemaining > 0` in the patient's active package:
     - Displays a prominent "Pay with Package Session" toggle/checkbox.
     - When activated: zeroes out financial totals (`bookingValue = 0`, `amountPaidNow = 0`, `remainingValue = 0`, marked as "Fully Settled").
     - Records `[Package Redemption]: <Package Name> - <Service Name> (Item ID: <Item ID>)` into the reservation `notes`.
     - In Booking Summary Confirmation Modal, clearly displays "0 EGP (Package Redemption)" with the package name.
3. **Bilingual Parity:**
   - Added all necessary keys in `adminTranslations` in `src/components/admin/translations.ts` for English and Arabic.
4. **Automated Diagnostic Test Verification:**
   - Added test case `TC-065` ("New Booking Customer Packages & Session Redemption Engine") to the Admin Settings System Test Suite (`INITIAL_SYSTEM_TEST_SUITES`).

---

## DEC-061: Staff Weekly Shift Schedule & Working Days Persistence Engine

**Date:** 2026-09-19
**Status:** Decided & Implemented

**Context:**
1. In Admin Employees (`AdminEmployeesView.tsx`), when clinic administrators modified weekly working shifts (toggling working days open/closed, adjusting shift start/end times, adding multiple shifts per day, or assigning branch-specific schedules) and clicked "Save Changes", the changes were not persisted or reflected upon reopening the edit modal.
2. The root cause had multiple components:
   - In `src/app/api/employees/route.ts`, the `PATCH` handler omitted `workingDaysHours` / `working_days_hours` extraction, sending only the legacy `shift` string (`computedShift`) to `employee_accounts`.
   - The `employee_accounts` database table in Supabase did not return `working_days_hours` in `GET /api/employees`.
   - When reopening the edit modal, `loadEmployeeWorkingSchedule` found no structured `working_days_hours` on the employee object and fell back to `parseShiftString(emp.shift || "Day")`. If the shift string was `"Multi-Shift Schedule"` or `"Day"`, it reset all days back to standard defaults (09:00 - 17:00).

**Decisions & Implementation:**
1. **Resilient Schedule Persistence Store (`/api/employees`):**
   - Added persistent helper functions `getEmployeeWorkingSchedulesMap()` and `saveEmployeeWorkingSchedule()` with dual storage: persisting structured employee schedules to both `data/employee_schedules.json` on disk and Supabase `page_settings` under the `employee_working_schedules` key, indexed across employee `id`, `email`, and `name` aliases.
   - Updated `PATCH /api/employees` and `POST /api/employees` to:
     - Extract `workingDaysHours` and attempt writing to `employee_accounts.working_days_hours` (with graceful fallback if the column is absent).
     - Persist structured schedule data in both disk and `page_settings`.
     - Synchronize with `providers.working_days_hours` when updating doctor accounts.
   - Updated `GET /api/employees` to merge schedule data from `employee_accounts`, local JSON, and `page_settings` into each employee record, guaranteeing structured `working_days_hours` and `workingDaysHours` are returned.
2. **Modal State Initialization & Schedule Loading (`AdminEmployeesView.tsx`):**
   - Updated `loadEmployeeWorkingSchedule()` to recursively resolve structured working day schedules from `branch_schedules[branchId].in_person`, `in_person`, `emp.working_days_hours`, and `emp.workingDaysHours`.
   - Initialized `newEmployeeSelectedScheduleBranchId` and `newEmployeeBranchSchedules` on both "+ Add Employee" button click and Edit pencil button click.
   - Ensured `onSubmit` clears `editingEmployee` state and cleanly awaits `fetchRolesAndEmployees()` and `fetchProviders()`.
3. **User Profile Schedule Visualization & Multi-Shift Rendering (`UserProfileView.tsx`):**
   - Updated `loadExtraDetails()` in `UserProfileView.tsx` to query `/api/employees` so that the profile view always receives the full enriched schedule with multi-shift arrays.
   - Resolved `rawSched` across `user.workingDaysHours`, `user.working_days_hours`, and fetched employee/doctor records, rendering multiple distinct shift badges and accurate daily/weekly work hours in the Weekly Schedule Matrix.
4. **Automated Diagnostic Test Verification:**
   - Added test case `TC-066` ("Staff Weekly Shift Schedule & Working Days Persistence Engine") to the Admin Settings System Test Suite (`INITIAL_SYSTEM_TEST_SUITES`).

---

## DEC-062: Comprehensive Laser Pulse Counter & Unified History Engine (Types 1, 2, 3)

**Date:** 2026-09-20
**Status:** Decided & Implemented

**Context:**
The clinic required a complete, multi-tiered laser pulse counting and accounting engine to support three distinct operational models across all 17 clinical and business scenarios:
1. **Type 1 — Sell by Service**: Patient purchases a fixed-price laser service (e.g., Full Body or Beard Laser). Routine pulse consumption is recorded for clinical tracking without altering service price (0 EGP delta). Optional additional pulses can be billed with a mandatory clinical reason, automatically staging extra charges in the reservation invoice.
2. **Type 2 — Sell by Pulse (FIFO Engine)**: Patient purchases a volume of retail pulses (e.g., 500, 1000, 2000 pulses). Purchases are combined into a patient-level General Active Pulse Balance banner while maintaining individual purchase records. When consumed in doctor sessions, a First-In, First-Out (FIFO) algorithm automatically consumes from the oldest active purchase first, spilling over into subsequent purchases, rejecting requests exceeding total balance, and auto-transitioning fully depleted records to Purchase History.
3. **Type 3 — Pulse Included in Package**: Predefined packages (e.g., "Full Body Laser 6 Sessions + 12,000 Pulses") track package-specific pulse balances (`included_pulses`, `used_pulses`, `remaining_pulses`), strictly isolated from retail pulse products, with automated package expiration validation.
4. **Unified Laser History**: A centralized audit feed and lifetime KPI aggregator logging all laser deliveries across all 3 types with treatment area tags, doctor/staff attribution, device tracking, surcharge breakdowns, and post-session remaining balance snapshots.

**Decisions & Implementation:**
1. **Database Schema & Migrations (`supabase/migrations/20260920000000_create_laser_pulse_engine.sql`):**
   - Created `laser_pulse_logs` table with columns: `id`, `customer_id`, `reservation_id`, `pulse_type` (`SERVICE`, `PULSE_PURCHASE`, `PACKAGE`), `treatment_area`, `pulses_used`, `remaining_balance_after`, `additional_pulses`, `pulse_value`, `additional_charge`, `total_patient_charge`, `additional_reason`, `source_id`, `doctor_id`, `doctor_name`, `device_id`, `device_name`, `session_date`, and `created_at`.
2. **Unified Laser Pulses API (`/api/laser-pulses`):**
   - `GET /api/laser-pulses`: Fetches unified logs and aggregates lifetime statistics (`totalSessions`, `totalPulsesDelivered`, `totalAdditionalPulses`, `totalAdditionalCharge`).
   - `POST /api/laser-pulses`: Validates non-negative inputs, enforces mandatory reason for additional billed pulses, persists logs to Supabase `laser_pulse_logs`, local disk `data/laser_pulses.json`, and `page_settings.laser_pulse_logs`.
3. **FIFO Retail Pulse Engine (`/api/customers/products`):**
   - Exported helper `consumePatientPulsesFIFO(customerId, pulsesToConsume, sessionContext)` which sorts active purchases by `created_at ASC`, deducts from the oldest batch, marks exhausted batches as `Depleted`, and halts with HTTP 400 if balance is insufficient.
   - Added `PATCH` action `fifo_consume` and enhanced `GET` summary with `totalActivePulses`.
4. **Package Pulse Balance Engine (`/api/customers/packages`):**
   - Extended customer package data models to track `includedPulses`, `usedPulses`, and `remainingPulses`.
   - Added `PATCH` action `consume_package_pulses` validating active status, expiration date, and remaining balance.
5. **Doctor Portal Session Counter Card (`DoctorOngoingSessionTab.tsx` & `DoctorAccountView.tsx`):**
   - Integrated dynamic Laser Pulse Counter card in Doctor Ongoing Session with Mode Switcher (Type 1 Service, Type 2 FIFO Pulse, Type 3 Package Pulses), treatment area selector, device picker, live extra pulse calculation (`Qty × Value`), mandatory reason validation, and real-time FIFO balance projection.
   - Integrated execution into `handleCompleteTreatment`: records unified laser log, deducts FIFO pulses / package pulses, updates device pulse counters, and stages invoice line items.
6. **Patient Laser History Drawers & Active Pulse Banner (`DoctorPatientHistoryDrawer.tsx` & `CustomerProfileDrawer.tsx`):**
   - Added dedicated "Laser History" tabs in both Doctor Patient History Drawer and Admin Customer Profile Drawer with lifetime KPI summary cards and chronological treatment tables.
   - Added General Active Pulse Balance banner in Customer Profile "Purchased Products & Cart" tab with "+ Sell Laser Pulses" modal dialog for selling retail pulses directly to patient balance.
7. **Bilingual Parity (`translations.ts` & `doctor/translations.ts`):**
   - Added complete English and Arabic dictionaries for all pulse modes, field labels, tooltips, validation errors, and KPI cards.
8. **Automated Diagnostic Test Verification:**
   - Added test case `TC-067` ("Laser Pulse Counter & Unified Laser History Engine") to the Admin Settings System Test Suite (`INITIAL_SYSTEM_TEST_SUITES`).

---

## DEC-063: Default Laser Pulse Pricing in Admin Settings & Service Equipment Connection Simplification

**Date:** 2026-09-20
**Status:** Decided & Implemented

**Context:**
1. **Configurable Default Laser Pulse Price:** Previously, the unit price per laser pulse (e.g., 5 EGP) was hardcoded or required manual entry when selling retail pulses to patients or billing additional pulses during doctor treatment sessions. Clinic owners required a centralized setting in Admin Settings (`/admin` -> Settings -> Booking Settings) to define the clinic-wide Default Price per Laser Pulse in EGP.
2. **Simplified Service Device Equipment Linking:** In Admin Services (`/admin` -> Services -> Connected Devices modal), connecting an equipment device to a service previously required configuring an arbitrary "Pulses Per Session" number. Because laser pulse consumption varies by patient and treatment area (tracked dynamically in the Laser Pulse Counter engine), this fixed number was obsolete and caused user confusion.
3. **Doctor Ongoing Session Simplification:**
   - Primary booked service delivered pulses can now be entered and highlighted directly on the booked service card in Session Flow (Type 1 Service mode).
   - In "Additional Clinical Services", device selection and pulse override inputs were removed, simplifying additional services to simple service item and price additions without equipment overhead.

**Decisions & Implementation:**
1. **Admin Booking Settings (`BookingSettingsView.tsx`, `page_settings.json`, `admin/page.tsx`):**
   - Added `defaultPricePerPulse` setting with numeric validation and EGP adornment in Booking Settings.
   - Added bilingual labels (`defaultPricePerPulse`, `defaultPricePerPulseHint`, info dialogs) in `translations.ts`.
   - Seeded default value `5` in `data/page_settings.json`.
   - Loaded and passed `defaultPricePerPulse` across Admin Settings and Customer Profile Drawer.
2. **Customer Profile Sell Pulses Prefill (`CustomerProfileDrawer.tsx`):**
   - "+ Sell Laser Pulses" modal dialog automatically prefills the Unit Price with `defaultPricePerPulse` (defaulting to 5 EGP if unset), calculating total price dynamically.
3. **Doctor Ongoing Session Pulse Pricing & Service Cleanup (`DoctorOngoingSessionTab.tsx`):**
   - Automatically loads `defaultPricePerPulse` from `/api/page-settings` to prefill `additionalPulseUnitPrice`.
   - Removed device selection dropdown and pulse override inputs from "Additional Clinical Services".
   - Highlighted `standardPulsesDelivered` input on the primary booked service card in Mode 1.
4. **Connected Devices Simplification (`ServiceDeviceEditor.tsx` & `/api/service-devices`):**
   - Removed `pulses_per_session` input and column from `ServiceDeviceEditor.tsx`.
   - Updated `POST /api/service-devices` to treat `pulsesPerSession` as optional (defaulting to 0), permitting pure device-to-service equipment linking.
5. **System Test Suite Diagnostic Verification:**
   - Added test case `TC-068` ("Service Equipment Connector & Pulse Pricing Engine") to the Admin Settings System Test Suite (`INITIAL_SYSTEM_TEST_SUITES`).

---

## DEC-064: Laser Services Multi-Payment Mode Architecture & Deficit Spillover Engine

**Date:** 2026-09-20
**Status:** Decided & Implemented

**Context:**
1. **`islaser` Service Flag & Equipment Connection:** Clinic services are now explicitly categorized with an `islaser` (or `is_laser`) boolean in the database and catalog. Standard services (`islaser: false`) behave normally, while laser services (`islaser: true`) require connected equipment devices and enforce a 3-tier payment selection workflow.
2. **3 Structured Payment Options for Laser Services:**
   - **Option 1: Pay by Service (Fixed Price)** (`SERVICE`): Patient pays the catalog price regardless of pulses delivered. Any extra pulses beyond baseline can optionally carry an extra charge with a mandatory reason.
   - **Option 2: Pay per Pulse (Post-Session Actuals)** (`PER_PULSE`): Reception/doctor agrees on a per-pulse rate (e.g., $1 or 5 EGP). Final session total equals `Delivered Pulses × Unit Rate`.
   - **Option 3: Pay with Pulses Package (Package Redemption + Spillover Engine)** (`PACKAGE`):
     - Active package pulses are redeemed during the session.
     - If patient has no package, prompts package purchase.
     - **Package Deficit Spillover Engine**: When delivered pulses exceed remaining package pulses (e.g. 6,000 delivered vs 4,000 balance -> 2,000 pulse deficit), two explicit resolution choices are presented:
       - **Choice 3A (Buy New Package)**: Deducts the deficit from a newly purchased package and adds the package price to the session invoice.
       - **Choice 3B (Pay Rest per Pulse)**: Billed excess pulses directly on the session invoice at the per-pulse rate.
3. **Patient Profile Retail Pulse Decoupling:** Standalone retail pulse purchase buttons were removed from the patient profile drawer, consolidating all pulse accounting through structured reception bookings and doctor session flows while retaining the full lifetime Laser History audit tab.

**Decisions & Implementation:**
1. **Database Migration (`supabase/migrations/20260920010000_add_islaser_to_services.sql`):**
   - Added `islaser` and `is_laser` boolean columns to `services` table with default `false` and indexed query performance.
   - Auto-tagged existing laser services matching `laser|pulse|hair removal|ليزر|نبضة` keywords.
2. **Catalog & API Support (`src/lib/services.ts` & `src/app/api/services/route.ts`):**
   - Added `islaser?: boolean; is_laser?: boolean;` to `ServiceItem` interface.
   - Updated `mapServiceRow` and `mapServiceToDb` in API routes to read and persist `islaser`.
3. **Admin Services View (`AdminServicesView.tsx` & `admin/page.tsx`):**
   - Added `Laser` badge in services table with `Sparkles` icon.
   - Added "Laser Service" toggle switch card in Add/Edit Service modal with live status indicator.
4. **Reception & New Booking Flow (`AdminNewBookingView.tsx`):**
   - Dynamically detects `isLaserService`.
   - Renders 3 interactive Laser Payment Mode selection cards (Fixed Service, Pay per Pulse, Pulses Package).
   - In Mode 2, displays live per-pulse unit price input prefilled from Booking Settings.
   - Persists selected mode and rate into booking notes and metadata.
   - Shows selected mode in Booking Confirmation summary modal.
5. **Doctor Ongoing Session & LIVE Math (`DoctorOngoingSessionTab.tsx` & `DoctorAccountView.tsx`):**
   - Mode selector tabs: Option 1 (`SERVICE`), Option 2 (`PER_PULSE`), Option 3 (`PACKAGE`).
   - Auto-detects payment mode from booking metadata.
   - Mode 2 calculates live session total: `standardPulsesDelivered * additionalPulseUnitPrice`.
   - Mode 3 integrates the **Package Deficit Spillover Interactive Card** with **Choice 3A** and **Choice 3B**.
   - `handleCompleteTreatment` stages line items in `reservation-products`, consumes package pulses, triggers package purchases, records unified laser history in `/api/laser-pulses`, and updates equipment device counters.
6. **Patient Profile Cleanup (`CustomerProfileDrawer.tsx`):**
   - Removed loose `+ Sell Laser Pulses` button and modal dialog from the products tab while preserving the dedicated Laser History tab.
7. **System Test Suite Diagnostic Verification:**
   - Added test case `TC-069` ("Laser Services Multi-Payment Mode & Deficit Spillover Engine") to the Admin Settings System Test Suite (`INITIAL_SYSTEM_TEST_SUITES`).

---

## DEC-065: Laser-Only Delivered Pulses Intake & Automated Equipment Device Resolution

**Date:** 2026-09-20
**Status:** Decided & Implemented

**Context:**
1. In Receptionist session finalization and ending session flow (`BookingDetailsModal.tsx`), manual equipment device dropdown selectors created unnecessary friction for non-technical receptionists.
2. Laser services are mapped to physical devices in Admin Settings (`/api/service-devices`). Pulses intake should strictly appear only for laser services (`checkIsLaserService`), and device resolution should happen automatically in the background.

**Decisions & Implementation:**
1. **Laser-Only Pulses Intake:**
   - Pulses input was gated behind `isLaser` / `checkIsLaserService` for both Primary Booked Service and Additional Services. Non-laser procedures do not display pulses intake.
   - Additional laser services prompt for delivered pulses with quick presets (`250`, `500`, `1,000`, `2,000`) before saving into session.
2. **Automated Equipment Device Resolution:**
   - Completely removed device selection dropdowns from Receptionist view.
   - Automatically queries `/api/service-devices?serviceId=...` on service selection and binds `deviceId`/`deviceName` in the background for pulse counter logging.

---

## DEC-066: Package Types & Laser Pulses Package Engine

**Date:** 2026-09-20
**Status:** Decided & Implemented

**Context:**
1. Clinics require selling dedicated Laser Pulses Packages (e.g. 5,000 pulses, 10,000 pulses) in addition to traditional multi-service packages.
2. Package creation must offer explicit package type selection (`services` vs `pulses`) and configure total pulse quotas with quick presets.

**Decisions & Implementation:**
1. **Database Schema & Migrations (`20260920020000_add_package_types_and_pulses.sql`):**
   - Added `package_type` (`'services' | 'pulses'`) and `total_pulses` integer to `packages` and `customer_packages` tables.
2. **Admin Package Management (`PackageAdminPanel.tsx`):**
   - Added interactive Package Type selector (`Services Package` vs `Laser Pulses Package`).
   - When Pulses Package is selected, renders pulse quota input with quick preset buttons (`1,000`, `2,500`, `5,000`, `10,000`, `20,000` pulses) without service requirement.
3. **Automated Diagnostic Verification:**
   - Added test case `TC-070` ("Package Types & Laser Pulses Package Engine") to `INITIAL_SYSTEM_TEST_SUITES`.

---

## DEC-067: Laser Per-Pulse Dynamic Calculation & Invoice Settlement Engine

**Date:** 2026-09-20
**Status:** Decided & Implemented

**Context:**
1. When Option 2 (Pay per Pulse / `PER_PULSE`) is selected in New Booking (e.g. rate = 1 EGP/pulse), all laser services delivered in that session (primary service + additional services) must be dynamically calculated: `delivered_pulses × agreed_price_per_pulse` (e.g. 250 pulses primary + 250 pulses additional @ 1 EGP = 500 EGP total invoice instead of catalog prices).
2. The invoice (Ending session summary, Checkout settlement modal, Invoice preview, and printed PDF) must explicitly display the settlement agreement statement:
   - English: `Settled that laser services in this session are charged per pulse (500 pulses × 1 EGP = 500 EGP)`
   - Arabic: `تم الاتفاق على أن تكون خدمات الليزر في هذه الجلسة مدفوعة بنظام حساب النبضات (500 نبضة × 1 ج.م = 500 ج.م)`
3. Regex parsing in `BookingDetailsModal.tsx` and `src/app/admin/page.tsx` was corrupted by `, Pulses: <num>` suffixes leaking into service names.

**Decisions & Implementation:**
1. **Centralized Note Parsing Helper (`parseAdditionalServiceLine` & `extractPrimaryPulses` in `BookingDetailsModal.tsx`):**
   - `parseAdditionalServiceLine`: Robustly parses service line format `Name (Qty: 1 x 150 EGP = 150 EGP, Pulses: 250)` without name corruption or regex fallthrough.
   - `extractPrimaryPulses`: Reliably extracts primary pulses from structured notes (`[Laser Pulses Delivered]: Primary: 250 pulses...` as well as direct digits and extra pulse formats).
2. **Dynamic Per-Pulse Rate Calculation:**
   - In `BookingDetailsModal.tsx`, `handleAddServiceToSession` sets `price = pulsesVal * pulseRate` for additional laser services in per-pulse sessions.
   - `handleConfirmEndSession` writes line items to `reservation-products` with effective prices, appends `[Laser Settlement]` and `[Laser Pulses Delivered]` notes, and updates total invoice.
   - `baseBookingPrice`, `additionalServicesSubtotal`, and `endSessionInvoiceTotal` compute `pulses × laserPulseRate`.
   - `bookingServices` in standard Booking Details view dynamically evaluates `primaryDeliveredPulses * laserPulseRate` with per-pulse badge and calculation string.
   - In `src/app/admin/page.tsx`, `checkoutBooking` and `invoiceBooking` calculate primary laser prices by `primaryDeliveredPulses * pulseRate`, parse additional services using `parseAdditionalServiceLine`, and display live pulse multipliers.
   - In `src/app/api/reservations/route.ts`, `writeCheckoutInvoice` verifies per-pulse mode and writes accurate per-pulse invoice line totals into the ledger.
3. **Laser Per-Pulse Settlement Agreement Banner & Detailed Payment Mode UI:**
   - Rendered across Ending Session view, standard Booking Details view (top settlement agreement banner with delivered pulses counter), 3-metrics row ("Session Type & Payment Mode" card with `Pay per Pulse (@ ${rate} EGP)`), Service Details card (with pulses count badge), Payment Summary card (with explicit Payment Mode row), Payment Settlement checkout modal, Invoice preview popup modal, and printed PDF template (`printUtils.ts`).
4. **Automated Diagnostic Verification:**
   - Verified under test case `TC-071` ("Laser Per-Pulse Dynamic Calculation & Invoice Settlement Engine") in `INITIAL_SYSTEM_TEST_SUITES`.

---

## DEC-068: Laser Pulses Package Redemption & Resilient Session Completion Engine

**Date:** 2026-09-20
**Status:** Decided & Implemented

**Context:**
1. Ending a session settled with a pulses package (Option 3: Pay with Pulses Package) previously threw a popup error: `"Database error"`.
2. Root causes identified:
   - `PATCH /api/reservations`: Updating `reservations` with extended columns (`laser_payment_mode`, `laser_price_per_pulse`, `delivered_pulses`, `actual_duration_minutes`, `doctor_notes`, etc.) failed with Postgres 42703 (missing columns) on unmigrated or older schemas.
   - `PATCH /api/customers/packages`: Querying `customer_packages` with synthetic IDs (e.g. `pb-...`) failed with Postgres 22P02 (invalid UUID input syntax).
   - `writeCheckoutInvoice` and `DoctorAccountView.tsx`: Base laser services in package sessions were not marked as 100% discounted redemptions, and hardware tracking pulses were written with unit price > 0, creating unwanted invoice charges.
   - `/api/reservation-products`: Did not accept parameter aliases (`productName`, `quantity`) or the `receptionist_global_ending` role.

**Decisions & Implementation:**
1. **Multi-Stage Resilient Reservation Update (`src/app/api/reservations/route.ts`):**
   - Wrapped `supabaseServer.from('reservations').update(updates)` in a schema-resilient catch block.
   - On error code `42703` or column errors, automatically strips optional extended columns and retries with core columns (`status`, `notes`, `amount_paid`, `amount_left`, `service_id`), preventing any 500 error popups.
2. **UUID-Guarded Package Querying (`src/app/api/customers/packages/route.ts`):**
   - Validates UUID syntax with `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` before querying `customer_packages` table, while updating `pulseStore` in `page_settings` seamlessly for all package IDs.
3. **0 EGP Base Package Redemption & Device Pulse Tracking (`writeCheckoutInvoice`, `DoctorAccountView.tsx`, `BookingDetailsModal.tsx`):**
   - In package mode, primary laser service line items receive a full 100% package discount (`unitPrice: basePrice, discount: basePrice, line_total: 0`).
   - Hardware counter pulse entries are recorded with `unitPrice: 0` so device tracking never creates phantom billable line items.
4. **Normalized Reservation Products API (`src/app/api/reservation-products/route.ts`):**
   - Fully supports payload aliases (`description` / `productName`, `qty` / `quantity`, `unitPrice` / `price`) and all staff roles.
5. **Automated Diagnostic Verification:**
   - Added test case `TC-072` ("Laser Pulses Package Redemption & Session Completion Engine") to `INITIAL_SYSTEM_TEST_SUITES`.

---

## DEC-069: Multi-Scenario Laser Pulses Package Settlement Architecture

**Date:** 2026-09-20
**Status:** Decided & Implemented

**Context:**
1. In `laserPaymentMode === "PACKAGE"`, clinics encounter multiple real-world scenarios:
   - **Scenario 1 (No existing package)**: A patient without an active pulses package books a laser session and selects Package mode. The patient must be able to select and purchase a new pulses package during the session checkout. The session invoice charges only the price of the purchased package (the laser session itself is 100% covered). Pulses delivered in this session are deducted from this new package, and the remaining pulses carry forward for future sessions without paying again.
   - **Scenario 2 (Existing package + Deficit spillover)**: When delivered pulses exceed remaining pulses in the patient's existing package (e.g. 10,000 delivered vs 5,000 remaining = 5,000 pulse deficit), the system offers two explicit resolution choices:
     - **Choice 3A (Buy New Package)**: The patient purchases a new package. The deficit pulses are deducted from the new package, the new package price is charged on the invoice, and remaining pulses carry forward.
     - **Choice 3B (Pay per pulse)**: The patient pays for the deficit pulses at the agreed per-pulse rate (`deficit × pulseRate`).
   - **Scenario 3 (Standard redemption)**: The patient has sufficient pulses. 0 EGP laser charge on invoice, pulses are deducted, remaining balance carries forward.
   - **Mixed Sessions**: Non-laser services (e.g. consultations, peelings) attached to the session are always added at full catalog price on top of the package mode choice (e.g. 7,000 EGP package + 150 EGP non-laser service = 7,150 EGP total invoice).
2. The package settlement agreement notice and badge must be surfaced prominently across the entire booking lifecycle: Doctor Ongoing Session live breakdown, Receptionist Booking Details modal, Payment Settlement checkout modal, Invoice Preview modal, and printed invoice PDFs with bilingual EN/AR statement.

**Decisions & Implementation:**
1. **Doctor Ongoing Session Engine (`DoctorOngoingSessionTab.tsx` & `DoctorAccountView.tsx`):**
   - Added live detection for `isNoActivePackage` in Mode 3 (`PACKAGE`), rendering the **Scenario 1 Package Selection Card** with searchable package picker, pulse delivery input with quick presets, live remaining balance calculation (`packageTotalPulses - deliveredPulses`), and invoice breakdown preview.
   - For Scenario 2, upgraded **Package Deficit Spillover Card** with side-by-side **Choice 3A** (Buy New Package) and **Choice 3B** (Pay per pulse) cards, live deficit calculations, and invoice impact breakdowns.
   - In `DoctorAccountView.tsx`, integrated automated package purchase via `POST /api/packages/sell`, captures the resulting `customerPackage.id`, and automatically calls `PATCH /api/customers/packages` (`consume_package_pulses`) for both Scenario 1 and Scenario 2 Choice 3A, plus Choice 3B excess pulse lines and standard redemption.
   - Formatted bilingual completion notes with `[Laser Package Redemption]` and `[Laser Settlement]` tags.
2. **Booking Details Modal & Settlement Notice (`BookingDetailsModal.tsx`):**
   - Automatically detects package redemption matches from notes or `laserPaymentMode === "PACKAGE"`.
   - Zeros out the base laser service price (`0 EGP (Package Redemption)`), ensuring the patient is not double-charged for the procedure while preserving the service line for clinical audit trails.
   - Renders a prominent purple/emerald **Laser Pulses Package Settlement Agreement Banner** at the top of the modal and an explicit `Package` badge in the 3-metrics row.
   - Supports mixed sessions by combining package purchases/deficit lines with standard non-laser services.
3. **Checkout, Invoice Modal & PDF Print Engine (`src/app/admin/page.tsx` & `src/lib/printUtils.ts`):**
   - In Payment Settlement checkout modal and Invoice Preview modals, dynamically identifies package sessions and renders the bilingual **Laser Package Settlement Notice**.
   - Zeroes out the base laser service line (`(Package Redemption · 0 EGP) / (استهلاك باقة · 0 ج.م)`).
   - In `printUtils.ts`, renders the `📦 Laser Package Settlement` agreement banner in the printed PDF and formats the laser service row at 0 EGP with redemption notes.
4. **Admin Settings System Test Suite Diagnostic Verification:**
   - Added test case `TC-073` ("Multi-Scenario Laser Pulses Package Settlement Engine") to `INITIAL_SYSTEM_TEST_SUITES` in `src/app/admin/page.tsx`.

## DEC-070: New Booking Laser Pulses Package Selection & In-Booking Catalog Purchase Engine
**Date:** 2026-09-20
**Context:**
1. In the New Booking creation modal (`AdminNewBookingView.tsx`), when a receptionist booked a laser service for a patient holding an active laser pulses package ("pulses v2"), the package card erroneously displayed `0 sessions left` and displayed an amber warning `Selected service is not covered in this package: Switch to a covered service:` because the system treated all packages as session-based (`package_items`) without supporting pulses packages (`packageType === 'pulses'`).
2. When the patient did NOT have an active pulses package and Option 3 (Pulses Package) was clicked, there was no way to select which pulses package to purchase or charge the booking for that package upfront.
3. Laser pulses packages cover all laser services in the clinic, so any laser service selected should automatically be recognized as covered.

**Decision & Implementation:**
1. **Active Pulses Package Detection & Quota Display (`AdminNewBookingView.tsx`):**
   - Added `checkIsPulsesPackage(pkg)` and `getPackagePulsesBalance(pkg)` helpers to extract `pulsesRemaining` and `totalPulses`.
   - Distinguishes pulses packages (`packageType === 'pulses'`) from session packages (`packageType === 'services'`).
   - For patients with an active pulses package:
     - Renders `${remaining.toLocaleString()} pulses left` badge instead of `0 sessions left`.
     - Displays `Laser Hair Removal Treatments (All Areas)` with `${remaining} / ${total} pulses` and `Selected` badge, removing the false warning.
     - Automatically zeros out the booking value (`0 EGP`) and shows a green confirmation banner that session pulses will be deducted upon treatment completion.
     - Notes record `[Laser Package Redemption]: <Package Name>`.
2. **In-Booking Catalog Pulses Package Selection (`AdminNewBookingView.tsx`):**
   - Loads catalog packages from `GET /api/packages` in `loadData`.
   - Filters active catalog packages where `package_type === 'pulses'` or `total_pulses > 0`.
   - When a patient with 0 active pulses packages selects Option 3, renders interactive catalog cards with package name, pulse quota (e.g. 10,000 pulses), and price (e.g. 6,000 EGP).
   - Selecting a package sets the booking value and amount paid now to the package's price (e.g. 6,000 EGP).
   - Staves `[Purchasing New Pulses Package]: <Name> (<Price> EGP · <Pulses> pulses)` in the reservation notes and passes `purchasingPackageId` in the reservation payload.
3. **Downstream Session & Settlement Integration (`DoctorAccountView.tsx`, `BookingDetailsModal.tsx`, `src/app/admin/page.tsx`):**
   - Updated `isBookingPackageMode`, `isCheckoutPackage`, and `isInvoicePackage` to recognize `[Purchasing New Pulses Package]` and `[Laser Package Redemption]`.
   - Resolves active session booking properly, seamlessly activating Scenario 1 (new package purchase charged on invoice, 100% covered laser session, pulses deducted and remainder carried forward).
4. **Admin Settings System Test Suite Diagnostic Verification:**
   - Added test case `TC-074` ("New Booking Laser Pulses Package Selection & Catalog Purchase Engine") to `INITIAL_SYSTEM_TEST_SUITES` in `src/app/admin/page.tsx`.

---

## DEC-071: Laser Package UI Isolation to Option 3 with Multi-Package Selector & Mixed Non-Laser Total Pricing

**Date:** 2026-09-20
**Status:** Decided & Implemented

**Context:**
1. In the New Booking modal (`AdminNewBookingView.tsx`), booking a laser service for a patient with pulses packages caused the pulses packages to appear in the general "Patient Packages & Subscriptions" bottom section. Because that section was built for fixed-session service packages (`package_items`), it displayed confusing warnings: `0 sessions left` and `Selected service is not covered in this package`.
2. The user required that on laser services, packages must appear **ONLY** when Option 3 (Pulses Package) is selected.
3. If the patient has multiple active pulses packages, the receptionist must be able to choose which one to use for the session.
4. If the patient has no active packages, Option 3 shows available catalog pulses packages to purchase upfront.
5. The session total price must strictly equal `pulses package price (if purchasing new) + any non-laser service price if used`, with all laser services 100% covered under the package quota (`0 EGP`).

**Decisions & Implementation:**
1. **Strict UI Isolation (`src/components/admin/bookings/AdminNewBookingView.tsx`):**
   - The general "PATIENT PACKAGES & SUBSCRIPTIONS" section at the bottom of the booking modal is wrapped in `{!isLaserService && ( ... )}` and iterates strictly over `customerServicePackages` (`customerPackages.filter(pkg => !checkIsPulsesPackage(pkg))`).
   - Laser packages never appear in this lower section, eliminating clutter and false `0 sessions left` alerts entirely.
2. **Option 3 Active Multi-Package Selector (`src/components/admin/bookings/AdminNewBookingView.tsx`):**
   - Computed `customerPulsePackages` array and state `selectedCustomerPulsePkgId`.
   - When the patient has active pulses package(s), Option 3 displays an interactive grid of cards for each package showing its remaining pulses, total pulses, progress bar, and expiry date.
   - The receptionist clicks between cards to choose which package to use (`selectedCustomerPulsePkgId`).
   - The booking value is set to 0 EGP with a green confirmation banner stating pulses will be deducted upon session completion.
3. **In-Booking Catalog Package Selection (0 Active Packages):**
   - When the patient has 0 active pulses packages, Option 3 displays interactive cards for catalog packages from `/api/packages`.
   - Selecting a package sets the booking value and amount paid to the package price (e.g. 6,000 EGP).
4. **Total Price Calculation Across Workflows (`BookingDetailsModal.tsx`, `DoctorOngoingSessionTab.tsx`, `DoctorAccountView.tsx`):**
   - Total session price is strictly: `package price + non-laser services price`.
   - Base and additional laser services are zero-rated (`0 EGP (Package Redemption)`).
   - In `BookingDetailsModal.tsx`, note parsing for `[Purchasing New Pulses Package]`, `[Laser Package Purchase & Redemption]`, and `[Laser Package Deficit Settlement]` creates product line items so invoice recalculation cleanly aggregates package costs with any non-laser services.
5. **Admin Settings System Test Suite Diagnostic Verification:**
   - Added test case `TC-075` ("Laser Option 3 Multi-Package & Non-Laser Add-on Pricing Engine") to `INITIAL_SYSTEM_TEST_SUITES` in `src/app/admin/page.tsx`.

---

## DEC-072: Laser Package Used Pulses Deduction, Cross-Workflow Execution & Database Column Synchronization

**Date:** 2026-09-20
**Status:** Decided & Implemented

**Context:**
1. The user requested: "make sure the used pulses is being deducted from the pacakges".
2. In-depth audit revealed several critical failure points:
   - **PostgreSQL Column Mismatch**: Migration `20260920030000_add_package_type_and_total_pulses_to_packages.sql` created columns `pulses_used` and `pulses_remaining` on `customer_packages`. However, `PATCH /api/customers/packages` (`consume_package_pulses`) was writing to non-existent columns `used_pulses` and `remaining_pulses`, causing silent Postgres 42703 errors inside `try/catch` and leaving database records untouched.
   - **Pulse Store Initialization Disconnect**: If a package was not yet registered in `page_settings` `customer_package_pulses`, the endpoint initialized `used_pulses: 0` and ignored the database's existing `pulses_used` / `pulses_remaining` balances.
   - **Doctor Portal Property Casing**: `GET /api/customers/packages` returns camelCase (`remainingPulses`, `totalPulses`, `pulsesRemaining`). `DoctorOngoingSessionTab.tsx` was filtering with `p.remaining_pulses` and `p.included_pulses` (snake_case), evaluating `rem` to `NaN` and hiding the patient's active pulses packages from the doctor.
   - **Doctor Target Package Fallback**: If `laserData.sourceId` was empty, `DoctorAccountView.tsx` failed to deduct pulses even if the booking had a linked package.
   - **Receptionist Global End Session Gap**: `BookingDetailsModal.tsx` (`handleFinalizeSessionStandalone`) deducted device hardware pulses, but had zero code to deduct pulses from the customer's package.
   - **Deficit Rejection**: Deductions exceeding balance threw HTTP 400 instead of consuming available balance and completing the package.

**Decisions & Implementation:**
1. **API Endpoint Column Synchronization & Robust Deduction (`src/app/api/customers/packages/route.ts`):**
   - Fixed `PATCH /api/customers/packages` (`consume_package_pulses`): writes to both `pulses_used` / `pulses_remaining` (the true DB columns) with fallback to `used_pulses` / `remaining_pulses`.
   - Initializes pulse balances from the database row (`pkgRow.pulses_used`, `pkgRow.pulses_remaining`).
   - Capped deduction: `actualDeduct = Math.min(qtyToDeduct, pkgPulses.remaining_pulses)`. If balance reaches 0, updates package status to `'completed'`.
   - Idempotency guard: verifies `booking_id` in `usage_history` so duplicate triggers from doctor, receptionist, or checkout never double-deduct pulses.
2. **Doctor Ongoing Session Component (`DoctorOngoingSessionTab.tsx`):**
   - Added robust property fallback chain (`p.remainingPulses ?? p.pulsesRemaining ?? p.remaining_pulses ?? p.pulses_remaining`).
   - Auto-selects the session's booked package (`activeSessionBooking.packageId`).
   - Aggregates delivered pulses across primary and all additional laser services in `laserPulseData.pulsesUsed`.
3. **Doctor Session Finalization Pipeline (`DoctorAccountView.tsx`):**
   - Resolves target package from `laserData.sourceId`, `targetBooking.packageId`, `targetBooking.package_id`, or queries the patient's active pulses package via `/api/customers/packages`.
4. **Receptionist Session Ending Engine (`BookingDetailsModal.tsx`):**
   - Added Step 5b in `handleFinalizeSessionStandalone`: resolves active or newly purchased package and calls `consume_package_pulses` for total laser pulses delivered.
5. **Checkout Settlement Safeguard (`src/app/admin/page.tsx`):**
   - Added automated deduction safeguard on payment settlement (`handleSavePayment`).
6. **Automated Diagnostic Verification:**
   - Added test case `TC-076` ("Laser Package Pulses Deduction & Cross-Workflow Synchronization Engine") to `INITIAL_SYSTEM_TEST_SUITES` in `src/app/admin/page.tsx`.

---

## DEC-073: In-Booking Package Selling to Customer Profile & Patient Directory Search Dropdown Engine

**Date:** 2026-09-21
**Status:** Decided & Implemented

**Context:**
1. The user reported two related issues:
   - "the painet list isnt showing": In New Booking (`AdminNewBookingView.tsx`), clicking "Browse Patients List" showed "Hide Patients List" but no dropdown appeared. This occurred because:
     a) Dropdown container had `{showCustomerDropdown && customerList.length > 0 && ( ... )}`, which suppressed the dropdown completely if `customerList.length === 0` despite having an inner empty state.
     b) `allCustomers` was querying `supabase.from("customers")` directly in the browser, failing silently under RLS.
     c) `src/app/admin/page.tsx` was passing `dbCustomers` instead of the full derived `customers` prop.
     d) Typing into phone prematurely hid the dropdown when no phone match occurred.
   - "the pusrcahsed pacakge in the new booking page isnt showing in the painet profile": When creating a new laser booking with Option 3 (Pulses Package) and selecting a catalog package to purchase, the package was only noted as text in the reservation (`[Purchasing New Pulses Package]`). It was not inserted into `customer_packages` in the database, leaving the patient profile showing "No active packages".

**Decisions & Implementation:**
1. **In-Booking Direct Package Selling (`src/components/admin/bookings/AdminNewBookingView.tsx`):**
   - In `handleSaveBooking`, if `isNewPackagePurchase && selectedCatalogPulsePkg`, the system resolves the customer (existing or auto-created via `POST /api/customers`) and immediately executes `POST /api/packages/sell`.
   - The returned `customerPackage.id` is linked to `payload.packageId` and recorded in reservation notes as `[Customer Package ID]: <id>`.
   - Dispatches `revera-laser-change`, `revera-booking-change`, and `revera-prescription-change`.
   - Because the package is now immediately created in `customer_packages`, opening the patient's profile (`CustomerProfileDrawer.tsx`) displays the active pulses package with full quota, price paid, purchase date, and active status.
2. **Reliable Patient Search & Dropdown Engine (`AdminNewBookingView.tsx` & `src/app/admin/page.tsx`):**
   - In `src/app/admin/page.tsx`, updated both `AdminNewBookingView` instances and `AdminAddPreviousBookingView` to pass `customers={customers}` (the full synthesized list) instead of `dbCustomers`.
   - In `AdminNewBookingView.tsx`, loads customers via `/api/customers` with session authorization headers and updates `allCustomers` whenever `customers` prop updates.
   - Removed `&& customerList.length > 0` condition from the dropdown container so clicking "Browse Patients List" always renders the dropdown.
   - Added an integrated search bar inside the dropdown to search patients by name, phone, or email.
   - Ensured empty search states render cleanly with a "Show all patients" button.
3. **Admin Settings System Test Suite Diagnostic Verification:**
   - Added test case `TC-077` ("In-Booking Package Selling & Integrated Patient Search Engine") to `INITIAL_SYSTEM_TEST_SUITES` in `src/app/admin/page.tsx`.

---

## DEC-074: Synthetic Customer UUID Crash (22P02) Resolution & Multi-Workflow Patient Profile Package Synchronization

**Date:** 2026-09-21
**Status:** Decided & Implemented

**Context:**
1. The user reported two related errors:
   - "the pusrcahsed pacakge in the new booking page isnt showing in the painet profile"
   - "that is happend when i tryed to purchase a package from the painet profile" (Error modal: `invalid input syntax for type uuid: "res-cust-01016302772"`).
2. Root Cause Analysis:
   - **Synthetic Customer IDs**: In `src/app/admin/page.tsx:3526`, patients created from historical reservations who do not yet have a corresponding row in `customers` table are synthesized with ID `res-cust-<phone>`.
   - **Postgres 22P02 Syntax Crash**: When opening such a patient profile and clicking "+ Sell Package", `useCustomerProfile.ts` sent `customerId: "res-cust-01016302772"` to `POST /api/packages/sell`. The endpoint executed `.eq('id', customerId)` and `.insert({ customer_id: customerId })` against tables with PostgreSQL `UUID` columns (`customers`, `invoices`, `customer_packages`), immediately crashing with `22P02: invalid input syntax for type uuid: "res-cust-01016302772"`.
   - **Query Crashing on Package Fetch**: In `src/app/api/customers/packages/route.ts`, `GET` passed `customerId` directly into `.in('customer_id', [customerId])` without verifying UUID format. For synthetic IDs, this threw 22P02, returning 500 error or empty packages, causing newly purchased packages to fail to render in the patient profile.
   - **Profile Package Refresh Event Gap**: `useCustomerProfile.ts` only listened to `revera-laser-change` for `fetchCustomerProductBalances`, but neglected to call `fetchCustomerProfilePackages`. When a package was purchased in New Booking, the profile never refreshed its package list.

**Decisions & Implementation:**
1. **Synthetic ID Resolution & Auto-Creation in `/api/packages/sell` (`src/app/api/packages/sell/route.ts`):**
   - Added `UUID_REGEX` validation. If `customerId` is a synthetic ID (`res-cust-...`) or raw phone string:
     - Extracts the phone digits.
     - Searches `customers` table by phone number (`mobile` or `phone`).
     - If no customer exists, auto-creates the real customer row using patient information from reservations.
     - Uses `finalCustomerId` (valid UUID) for customer verification, `invoices` insert, `customer_packages` insert, `recordTransaction` ledger, customer `spent_amount` updates, and wallet movements.
   - Added `GET` handler returning status 200 for diagnostic verification in System Test Suite (`TC-077`).
2. **Hardening Patient Profile Client (`src/components/admin/patients/useCustomerProfile.ts`):**
   - In `handleSellPackageToCustomer`: detects non-UUID `customerId`, resolves or creates the real customer record via `POST /api/customers`, and updates `viewingCustomerProfile.id`.
   - On sale completion: updates `viewingCustomerProfile.id` with `data.customerPackage.customer_id` and immediately re-fetches customer packages.
   - In `handleAddProductToPatient`: applies the same synthetic ID resolution to prevent 22P02 crashes when adding inventory products to reservation-synthesized patients.
   - In `useEffect`: wired `revera-laser-change` to re-fetch `fetchCustomerProfilePackages` and `fetchCustomerPackageRedemptions` so cross-component purchases (New Booking, Doctor Session, Receptionist Session) immediately reflect in open patient profiles.
3. **Safe UUID Filtering & Synthetic Lookup in `/api/customers/packages` (`src/app/api/customers/packages/route.ts`):**
   - When `customerId` is synthetic (`res-cust-...`), extracts digits to `lookupMobile` and matches all associated UUIDs in `customers`.
   - Filters `validCustomerIds = customerIds.filter(id => UUID_REGEX.test(id))` before running `.in('customer_id', validCustomerIds)` on `customer_packages` and `customer_product_balances`.
   - Prevents all 22P02 UUID crashes while finding packages belonging to this phone number.
4. **Resilience in Inventory POS Sales (`src/app/api/inventory/products/sales/route.ts`):**
   - Added `UUID_REGEX` and synthetic ID auto-resolution/creation to prevent 22P02 crashes during product sales.

---

## DEC-075: In-Booking Package Partial Payment & Session Balance Preservation

**Date:** 2026-09-21
**Status:** Decided — active

**Context:**
When booking a new patient who didn't have an existing pulses package, the receptionist could select Option 3 (In-Booking Package Purchase), choose a 1000 EGP package, and enter 500 EGP as the amount paid now. After the session started and ended via the doctor portal, the system showed the invoice as "fully settled" even though 500 EGP remained outstanding. The outstanding balance was silently zeroed out.

**Root Causes:**
1. **`/api/packages/sell`**: The POST body never received `amountPaid` from `AdminNewBookingView.tsx`, so it always defaulted to full payment (grandTotal). Invoice status was always `'issued'` with full 1000 EGP payment recorded.
2. **`DoctorAccountView.tsx` session completion**: In PACKAGE mode, `effectiveBasePrice = 0` and `effectiveLaserSessionCharge = 0` (standard redemption, no deficit), so `sessionComputedTotal = 0`, causing the PATCH to set `amountLeft = max(0, 0 - 500) = 0`, wiping the outstanding balance.
3. **`BookingDetailsModal.tsx` end session total**: `baseBookingPrice` was forced to `0` for isLaserPackage mode, and the legacy `totalPrice` computation for laser modes used only `calculatedTotal` (derived from the services cost line items, not the package purchase price), so `endSessionInvoiceTotal = 0` and `endSessionAmountLeft = 0`.
4. **`BookingDetailsModal.tsx` Payment Mode label**: The label only checked `isLaserPerPulse` — if false, it always rendered "Standard Service" even when `isLaserPackage` was true.

**Decisions & Implementation:**
1. **`AdminNewBookingView.tsx`**: Added `amountPaid: numAmountPaid` to the `/api/packages/sell` POST body so the actual partial payment flows through correctly.
2. **`/api/packages/sell`**: Updated POST handler to extract `amountPaid`/`paidAmount` from request body. Computes `actualPaid = min(grandTotal, max(0, amountPaid))`, `remainingDue = grandTotal - actualPaid`, and sets correct `invoiceStatus` (`'paid'` | `'partially_paid'` | `'issued'`). Payment row, transaction ledger, and customer `outstanding` now reflect the actual partial payment.
3. **`DoctorAccountView.tsx`**: For PACKAGE mode, computes `bookedPackagePrice` by parsing `[Purchasing New Pulses Package]: Name (PRICE EGP)` from booking notes. Also reads `originalBookingCommitment = amountPaid + amountLeft` from the booking record. `sessionComputedTotal = max(sessionComputedRaw, bookedPackagePrice, originalBookingCommitment)` — ensuring total is never collapsed to zero for package purchases.
4. **`BookingDetailsModal.tsx` (session panel)**:
   - Recovers `bookedPackagePurchasePrice` from booking notes for isLaserPackage bookings.
   - `totalPrice` for laser modes now uses `max(calculatedTotal, bookedPackagePurchasePrice, rawPaid + rawLeft)` to preserve the original financial commitment.
   - `isInvoicePaid` now correctly checks `sessionPaid >= totalPrice` (not the rawLeft-zero condition which could false-positive).
   - `endSessionInvoiceTotal` for isLaserPackage uses `max(computed, bookedPackagePurchasePrice, rawPaid + rawLeft)`.
   - Payment Mode label now shows "Pulses Package" / "باقة نبضات" (with purple Zap icon) when `isLaserPackage` is true, instead of always falling back to "Standard Service".

**Rule:** When computing session totals for PACKAGE mode laser bookings, NEVER collapse the total to a value less than the original booking commitment (`amountPaid + amountLeft`). Always parse the booked package price from booking notes as a floor for the invoice total.

---

## DEC-076: Database Synchronization for Services and Categories Across Devices

**Date:** 2026-09-22
**Status:** Decided — active

**Context:**
Administrators modifying service categories, adding/editing services, or toggling service active/visibility states reported that changes were only visible on the browser where the edits were made, even though services rows in Supabase were updated. On other devices, services under new categories were completely missing, and toggles remained in their default or local state.

**Root Causes:**
1. **`localStorage` category storage:** `getDynamicCategories()` and `saveDynamicCategories()` used client `localStorage` (`_dynamic_categories`). Categories created or reordered on one device were never saved to or fetched from the `categories` table in Supabase.
2. **Hidden services from category omissions:** In `AdminServicesView.tsx`, services were grouped and rendered strictly by iterating over `localCategories`. Any service belonging to a category that was not seeded in another user's local browser storage was completely omitted from the UI.
3. **`_service_toggles` in `localStorage`:** Activating or deactivating a service only updated `localStorage` (`_service_toggles`) on that machine instead of persisting to `services.active` and `services.visible` in Supabase.
4. **Public sections dependency:** `HomeServicesSection.tsx` and `ServicesSection.tsx` filtered active services using `isServiceActive(...)` against `localStorage`.

**Decisions & Implementation:**
1. **Dynamic & Public `/api/categories` (`src/app/api/categories/route.ts`):**
   - Added `export const dynamic = 'force-dynamic'` and `cache: 'no-store'`.
   - Made `GET /api/categories` public (no staff auth required), enabling public website sections and all client sessions to fetch categories directly from Supabase.
   - Auto-seeds the `categories` table with default `CATEGORY_LABELS` on first read if empty.
   - Preserves authenticated staff requirement for `POST` (upsert) and `DELETE`.
2. **Dynamic `/api/services` (`src/app/api/services/route.ts`):**
   - Added `export const dynamic = 'force-dynamic'`.
   - Explicitly preserves and maps `visible` and `active` boolean fields across DB operations.
3. **Admin Panel Synchronization (`src/app/admin/page.tsx` & `AdminServicesView.tsx`):**
   - Added `loadCategoriesFromApi`, `syncCategoriesToApi`, and `deleteCategoryFromApi` to persist category creation, deletion, and drag-and-drop reordering to Supabase.
   - `loadServicesFromApi` initializes `serviceToggles` strictly from database `s.active` and `s.visible` fields with auto-discovery of unmapped service category keys.
   - `toggleService` updates `localServices` and immediately triggers `syncServicesToApi` to persist `active`/`visible` states to Supabase.
   - `AdminServicesView.tsx` computes `completeCategories` ensuring that any category key referenced by a database service is rendered even if not explicitly created yet.
4. **Client Website Sections (`HomeServicesSection.tsx`, `ServicesSection.tsx`, `BookingModal.tsx`):**
   - Fetches `/api/categories` and `/api/services` with `{ cache: 'no-store' }`.

---

## DEC-077: Elimination of Hardcoded Mock Data, Auto-Seeding, and Ensuring Pure Database-Driven Services & Categories

**Date:** 2026-09-22
**Status:** Decided — active

**Context:**
Users reported that deleted categories kept resurrecting and default categories/mock services could not be permanently removed. When inspecting the database, deleted records were being automatically recreated by backend and frontend auto-seeding routines whenever a table was empty or storage was unpopulated.

**Root Causes:**
1. **API Auto-Seeding (`src/app/api/categories/route.ts`):** `GET /api/categories` had fallback logic that automatically upserted hardcoded mock categories (`dermatology`, `gynecology`, `physiotherapy`, `osteopathy`) directly into Supabase whenever `categories` table had 0 rows.
2. **Client `localStorage` Auto-Seeding (`src/lib/serviceStore.ts`):** `getDynamicCategories()` and `getDynamicServices()` inserted mock categories and 20 sample services into `localStorage` if local storage keys were empty.
3. **Hardcoded Mock Constants (`src/lib/services.ts`):** `SERVICES` contained 20 hardcoded mock service objects and `CATEGORY_LABELS` contained 4 hardcoded categories.
4. **Length-conditioned API fallbacks:** In consumer components (`HomeServicesSection`, `ServicesSection`, `BookingModal`, and `admin/page.tsx`), empty arrays (`[]`) returned by the API were treated as missing data due to `data.length > 0` checks, triggering fallbacks to mock data.

**Decisions & Implementation:**
1. **Purged All Mock Data from Codebase:**
   - `SERVICES` in `src/lib/services.ts` is now an empty array `[]`.
   - `CATEGORY_LABELS` is now an empty map `{}`.
2. **Removed Auto-Seeding from API Routes:**
   - `GET /api/categories` returns `[]` when the table is empty and never upserts default categories into Supabase.
   - `DELETE /api/categories?key=...` deletes the category record from `categories` and cascades to remove any associated services in that category.
3. **Removed Auto-Seeding from `serviceStore.ts`:**
   - `getDynamicCategories()` and `getDynamicServices()` return `[]` when storage is empty, with zero mock insertion.
4. **Direct Array Assignment in Consumer Views:**
   - Frontend components now check `Array.isArray(data)` rather than `data.length > 0`, ensuring that 0 categories or 0 services are correctly recognized as intentional empty states.
   - Added friendly empty states in `AdminServicesView.tsx` when no categories are created yet.
5. **System Test Suite Diagnostics:**
   - Added `TC-079` to verify database-driven categories CRUD, zero fake defaults, and clean category deletion.

---

## DEC-078: Resilient Service Persistence, Database Column Alignment, and Case-Insensitive Multi-Role Staff Access

**Date:** 2026-09-22
**Status:** Decided — active

**Context:**
When superadmin or admin users attempted to create or edit a service in the admin panel, the operation failed with an error notification *"Failed to save service. Please check your permissions and try again."*

**Root Causes:**
1. **Schema Column Cache Mismatch in `POST /api/services` (`mapServiceToDb`):**
   `mapServiceToDb` was passing `islaser: isLaser` and `is_laser: isLaser` directly into Supabase/PostgREST `.insert()` and `.upsert()` payloads. The `services` table in PostgreSQL does not have an `is_laser` or `islaser` column, causing PostgREST to immediately fail with:
   `"Could not find the 'is_laser' column of 'services' in the schema cache"` (HTTP 500).
2. **Strict `employee_accounts` Auth-ID Linkage in `requireStaffAccess`:**
   `requireStaffAccess` queried `employee_accounts` exclusively by `.eq("auth_user_id", authData.user.id)`. If an admin/superadmin account was registered or seeded in `employee_accounts` with matching `email` but `auth_user_id` was `NULL` or not linked yet, `requireStaffAccess` returned `403` (*"Staff access is required"*).
3. **Role Case-Sensitivity and Granular Permission Checking (`hasGranularPermission`):**
   Role checking in `hasGranularPermission` had a strict bypass `if (access.role === "superadmin") return true;`. Normalized role names and `admin` roles, or roles with wildcard `*` permissions, needed consistent normalization across all granular checks.

**Decisions & Implementation:**
1. **Aligned Service DB Mapping with Schema:**
   - Removed nonexistent `islaser` and `is_laser` columns from `mapServiceToDb` in `src/app/api/services/route.ts`.
   - Enhanced error responses across `GET`, `POST`, and `DELETE` in `src/app/api/services/route.ts` to surface exact underlying database error messages (`err?.message`).
2. **Resilient Staff Access & Auto-Linking (`src/lib/access.ts`):**
   - Added email fallback (`.ilike("email", authData.user.email)`) in `requireStaffAccess` when `auth_user_id` is unlinked, with automatic linking of `auth_user_id`.
   - Normalized role casing and formatting across `requireStaffAccess`, `hasStaffPermission`, `hasFinancePermission`, and `hasGranularPermission` (supporting `"superadmin"`, `"Super Admin"`, `"admin"`, etc.).
3. **Granular Permission Wildcards and Role Equivalence:**
   - Extended `hasGranularPermission` to recognize `"superadmin"`, `"admin"`, and wildcard `*` permissions across all actions including `services.create`, `services.edit`, `services.delete`.

---

## DEC-079: Doctor Screen Records Delivered Pulses Only — Package Sales And Payment Choices Move Entirely To Reception

**Date:** 2026-09-22
**Status:** Decided — active

**Context:**
Brief 34 (landed 2026-09-20/21, hardened 2026-09-22) shipped a "Choice 3A / 3B" UI directly inside
the doctor's active-session screen (`DoctorAccountView.tsx` / `DoctorOngoingSessionTab.tsx`): when a
laser session's delivered pulses exceed the patient's remaining pulses-package balance, the **doctor**
is shown the package balance, the resolved per-pulse price, and is asked to choose between selling the
patient a new package or billing the deficit per-pulse — and the doctor's choice writes the invoice
line. While live-verifying Brief 34's fix for RISK-095, Mohamed noticed the doctor screen surfaces
pulse balances and money at all, and asked directly: a patient does not buy anything from the doctor —
packages, prices, and how a deficit gets paid are reception's job, not the doctor's. The doctor's only
real job at the point of care is to record how many pulses were actually delivered.

**Alternatives Considered:**
1. Keep the doctor's 3A/3B UI as-is; add a reception-side backstop only (the original Brief 35 scope
   as drafted in `WINDSURF_BRIEFS.md` before this decision — reception re-prompts only if the doctor
   left a deficit unresolved).
2. Remove the doctor's 3A/3B UI entirely; the doctor screen becomes record-only (delivered pulse
   count, nothing else); every package sale, payment-method choice, and deficit resolution happens
   exclusively at reception checkout, through one server operation.
3. Hybrid — keep 3A/3B as an optional doctor shortcut but hide the money figures from the doctor's
   view.

**Chosen Option:** #2.
The doctor's active-session screen is record-only for laser pulses: no package selection, no price or
balance display, no "sell new package" / "pay per pulse" choice, and no invoice-line writes from that
screen. Reception's checkout (Brief 35, rewritten under this decision) becomes the **sole** place a
pulse deficit is resolved, a package is sold, or money changes hands.

**Reason:**
- Matches the real clinic workflow: patients pay reception, not the doctor, and the doctor has no
  reason to see package pricing or make a sales decision mid-session.
- Directly removes the defect class RISK-095 exposed — a doctor-side money/package decision, built and
  tested in isolation, silently broke once wired into the per-pulse rate guard. Taking that decision
  out of the doctor's screen removes an entire class of future doctor-side money bugs, not just this
  one.
- Collapses what would otherwise be two parallel deficit-resolution paths (doctor 3A/3B and reception
  checkout) into one from the start, instead of shipping both and unifying them later — Brief 35's
  queued "Brief D — unify the doctor and checkout deficit paths" becomes largely moot under this
  decision; see Impact below.

**Trade-offs:**
- Brief 34's Choice 3A/3B UI in `DoctorAccountView.tsx` / `DoctorOngoingSessionTab.tsx` becomes
  removal scope, not a feature to build on — real, already-partially-tested work is discarded rather
  than extended.
- Brief 35 as drafted before this decision assumed the doctor's 3A/3B choice stays and reception only
  backstops an *unresolved* deficit (reading an "already resolved by doctor" marker). That draft is
  superseded and must be rewritten, not patched, under this decision.
- The doctor screen still needs *some* signal when delivered pulses exceed the visible balance (so the
  doctor knows to tell the patient "reception will sort out the difference"), but that signal must stop
  short of pricing, package selection, or any write — the exact boundary is Brief 35's to define.

**Impact on Codebase:**
- `ai_docs/WINDSURF_BRIEFS.md` Brief 35 rewritten under this decision (see this file's history for the
  prior draft) to remove the doctor's 3A/3B choice UI and make reception checkout the only deficit-
  resolution surface, built on Brief 34's `laserDeficit.ts` and Brief 34B's `consume_package_pulses`
  RPC exactly as before.
- Brief D's original framing ("migrate the doctor flow onto the new server operation") is no longer
  needed as a follow-up migration, since there is only one path from the start; Brief D is narrowed to
  FEFO-across-packages only (still applies to reception's single checkout path).
- No schema change required by this decision itself — `laser_payment_mode` / `laser_price_per_pulse` /
  `delivered_pulses` (Brief 34) and Brief 35's own marker columns are unaffected; only which UI is
  permitted to write them changes.

---

## DEC-080: Laser Deficit Resolution Server Operation And Marker Design (Brief 35 implementation of DEC-079)

**Date:** 2026-09-23
**Status:** Decided — implemented

**Context:**
DEC-079 made reception checkout the only place a laser-pulse deficit is resolved. Brief 35 then needed
a concrete shape for that operation: a client could never be trusted to state the deficit, the price,
or the rate, and three separate writes (source-package consume, package sale or invoice line, and a
"don't ask again" marker) had to stay consistent.

**Decided:**

1. **Route shape:** `POST /api/reservations/laser-deficit` resolves; `GET` on the same route previews
   (delivered/consumed/remaining/deficit/resolved-rate/marker state). A dedicated route rather than
   extending `PATCH /api/reservations` — that route is already the busiest write path, and deficit
   resolution has its own failure surface that must return its own status rather than being folded
   into a status-transition PATCH.

2. **The client sends no amounts.** POST takes `reservationId`, `choice` (`BUY_NEW_PACKAGE` |
   `PAY_PER_PULSE`), `packageId` (buy only), `sourceCustomerPackageId` (optional), and the
   receptionist's real `paymentMethod`/`amountPaid`. The server re-reads `delivered_pulses`,
   the package balance, the catalog price, and the per-pulse rate (via `resolveLaserPulseRate`,
   the existing chain: reservation snapshot → `page_settings.home.booking.defaultPricePerPulse` →
   legacy `@ X EGP/pulse` notes → `null` = refuse).

3. **Consume order:** the source package is drained first via `consume_package_pulses` (the Brief 34B
   RPC — no direct column writes), then the deficit remainder is settled by the choice. The RPC's
   `UNIQUE(customer_package_id, reservation_id)` makes the consume replayable.

4. **Marker:** `reservations.laser_deficit_resolution` (`'BUY_NEW_PACKAGE'`/`'PAY_PER_PULSE'`) +
   `laser_deficit_pulses`, written only after the resolution writes succeed. `NULL` = unresolved /
   no deficit. It is the reservation-level idempotency key: a repeat POST returns
   `{ alreadyResolved: true }` without writing anything. Needed because the usage-ledger unique index
   only protects the pulse consume, not the invoice line or the package sale.
   **Legacy interaction:** bookings resolved before the marker columns wrote
   `[Laser Settlement]`/`[Laser Package Redemption]` notes tags instead; a tag mentioning
   `deficit`/`excess`/`exhausted`/`عجز` counts as resolved (returned as `resolution: 'LEGACY'`).
   Tag reading remains a fallback only — nothing new writes tags; new state lives in columns.
   (See RISK-097 for the marker-write-failure edge and the lack of cross-table atomicity.)

5. **Internal reuse, not re-implementation:** BUY_NEW_PACKAGE calls `POST /api/packages/sell`'s
   handler with the caller's auth token (price re-resolved from the `packages` row); PAY_PER_PULSE
   calls `POST /api/reservation-products` with `lineType: 'device_pulses'` (the route's own
   late-invoice append for already-invoiced reservations is preserved).

6. **Blocking:** `LaserDeficitPrompt` renders inside the Checkout modal and `BookingDetailsModal`'s
   end-session panel; both flows also GET-check the deficit inside their confirm handlers and return
   before the money/status write while `deficit > 0 && !resolved`.

**Impact:** the doctor's screen is record-only (DEC-079); the sole authoritative settlement path is
this route, called from both reception surfaces.

## DEC-081: Strict Isolation of Customer Packages from Retail Product Balances

**Date:** 2026-09-23
**Status:** Decided — active
**Note:** originally numbered DEC-080 by its author (`saifuldeennaser`), working in parallel on
`origin/dev` without this session's DEC-080 — renumbered on merge to avoid a collision. Cherry-picked
from commit `71c33e0`.

**Context:**
When retail products (e.g., "Retinol Anti-Aging Serum", "Skin Protector") were sold to a patient via POS / patient profile, they correctly appeared under the "Purchased Products & Cart" tab. However, they also unexpectedly appeared as active items in the "Purchased Packages" section of the patient profile.

**Root Causes:**
In `src/app/api/customers/packages/route.ts`, the `GET` handler contained a legacy fallback step (section 2) that queried `customer_product_balances` and transformed every non-pulse product balance into a `syntheticPkg` object, appending it to the `packages` response array. As a result, every sold retail product was displayed as a package in the patient profile and wherever package lists were rendered.

**Decisions & Implementation:**
1. **Removed Synthetic Package Generation from `/api/customers/packages`:**
   - `GET /api/customers/packages` now strictly queries the `customer_packages` table (for both service packages and laser pulse packages).
   - Retail products stored in `customer_product_balances` remain strictly owned by `/api/customers/products` and the "Purchased Products & Cart" tab.
2. **Added Regression Test:**
   - Added test in `tests/routes/customers-packages.test.ts` asserting that records in `customer_product_balances` are never returned as packages.

---

## DEC-082: End-to-End Pulse Package Linkage, Checkout Pulse Deduction Breakdown, and Profile Bar Synchronization

**Date:** 2026-09-23
**Status:** Decided — active
**Note:** cherry-picked from commit `fdebc6b` (`saifuldeennaser`, working in parallel on `origin/dev`).
Its number happens to already match this session's sequence — no renumbering needed. The
predecessor commit on `origin/dev` (`53e8fcf`, "Accurate Package Classification and Pulse Quota
Resolution", their DEC-081) was deliberately **not** merged: it reintroduces resolving
`customer_packages.total_pulses` from `pkgMeta.totalPulses` / a package-name regex, which is
exactly the fabricated-quota pattern Brief 34B (RISK-096) removed. The one genuinely useful part of
that commit — not misclassifying an explicit services package with "laser" in its name as a pulses
package — still needs doing; tracked separately rather than taken as-is.

**Context:**
When a laser pulse package is selected or purchased in Option 3 of New Booking, the session needed to use that specific package. Upon completing the treatment and opening reception checkout, the popup must display exactly how many pulses are deducted from the package (e.g. 2,000 pulses deducted from 5,000 pulses package, leaving 3,000 pulses remaining). In the patient profile, the progress bar must accurately reflect the real-time remaining and used pulse balances.

**Decisions & Implementation:**
1. **Reservation Package Linkage:**
   - In `AdminNewBookingView.tsx`, when Option 3 is selected with a package purchase, `[Customer Package ID]: <id>`, `[Laser Package]: <name> (Package ID: <id>)`, `customerPackageId`, and `laserPaymentMode: "PACKAGE"` are persisted on the reservation and notes.
   - In `src/app/api/reservations/route.ts`, `mapRow` and `POST` persist and return `laser_payment_mode`, `laser_price_per_pulse`, `delivered_pulses`, `packageId`, and `customerPackageId`.
2. **Doctor Ongoing Session Auto-Selection:**
   - In `DoctorOngoingSessionTab.tsx`, linked package IDs from reservation metadata or structured note tags are automatically matched to the patient's active pulse packages. (This selection only feeds the doctor's clamped consume against the correct source package, per DEC-079 — it is not a reintroduction of a doctor-side choice UI.)
3. **Checkout Modal Pulse Deduction Breakdown:**
   - In `src/app/admin/page.tsx`, when checking out a laser package reservation, the modal matches the linked pulse package, displays current package balance, session usage, remaining pulses after checkout, and a progress bar preview with a clear natural-language summary. This is informational display only; it sits alongside, and does not replace, Brief 35's `LaserDeficitPrompt` gate for the deficit case (DEC-080).
   - On checkout settlement, `consume_package_pulses` RPC executes pulse deduction and emits `revera-laser-change` for instantaneous cross-component refresh.
4. **Patient Profile Progress Bar:**
   - In `CustomerProfileDrawer.tsx`, the progress bar calculates `(remainingPulsesVal / effectiveTotal) * 100` and displays both remaining pulses and used pulses counters clearly.

---

## DEC-083: In-Booking Package Unpaid Balance Resolution and Checkout Debt Settlement

**Date:** 2026-09-23
**Status:** Decided — active
**Note:** cherry-picked from commit `367bf38` (`saifuldeennaser`, working in parallel on `origin/dev`).

**Context:**
When a patient purchased a package during New Booking with a partial payment / deposit (e.g. Package price 2,500 EGP, paid 2,000 EGP at booking, leaving 500 EGP outstanding balance), opening the Payment Settlement Checkout popup after the session displayed 0 EGP due. This occurred because laser package session services evaluate to 0 EGP (package redemption), while the 2,000 EGP deposit was subtracted from total cost (= 0 EGP), causing `balanceDue` and `netDue` to evaluate to 0 EGP rather than 500 EGP.

**Decisions & Implementation:**
1. **Package Purchase Line Item in Checkout Modal:**
   - In `src/app/admin/page.tsx`, the checkout calculation parses package purchases from reservation notes (e.g. `[Purchasing New Pulses Package]: Name (2500 EGP)`) and booking metadata.
   - A dedicated line item for the purchased package (2,500 EGP) is included in the invoice items and added to `totalCost`.
   - `totalCost` (2,500 EGP) minus `depositAlreadyPaid` (2,000 EGP) correctly evaluates to `balanceDue = 500 EGP` and `netDue = 500 EGP`.
2. **Interactive Payment Settlement Input:**
   - In the Checkout Modal UI, `Amount Paid` defaults its placeholder to `netDue` (500 EGP) and includes a 1-click "Pay Full" button.
3. **Automatic Package Debt Allocation:**
   - On checkout confirmation (`handleConfirmCheckout`), if the patient had an outstanding package balance and made a payment at checkout, `/api/customers/settle-debt` allocates the payment to the package invoice and decrements `customers.outstanding`.
   - In `src/app/api/customers/settle-debt/route.ts`, debt settlement is extended to allocate against unpaid issued invoices (including package sale invoices).

---

## DEC-084: Zero-Cost Package Redemption Session Payment Status Resolution

**Date:** 2026-09-23
**Status:** Decided — active
**Note:** cherry-picked from commit `90436e5` (`saifuldeennaser`, working in parallel on `origin/dev`).
`isInvoicePaid`'s new `isLaserPackage` branch is a display-only flag in this modal; it does not
bypass Brief 35's separate pre-write deficit gate (DEC-080), which still blocks the actual
confirm/checkout action while a deficit is unresolved regardless of what this badge shows.

**Context:**
When a patient had an existing package and attended a booking paid via package redemption (0 EGP due, 0 EGP paid, 0 EGP left), confirming checkout completed the reservation. However, `BookingDetailsModal`, `AdminBookingsView`, and `ReceptionDashboardView` displayed "Unpaid" and showed the "Pay & Settle Invoice" button.

**Root Causes:**
1. In `BookingDetailsModal.tsx`, `isInvoicePaid` required `sessionPaid > 0` (`sessionLeft <= 0 && sessionPaid > 0`). When a session is 100% covered by a package, `sessionPaid` is 0 EGP, which caused `isInvoicePaid` to evaluate to `false`.
2. In `AdminBookingsView.tsx` and `ReceptionDashboardView.tsx`, payment status checks checked `amountPaid > 0 ? "Paid" : "Unpaid"`, rendering package covered bookings as "Unpaid".

**Decisions & Implementation:**
1. In `BookingDetailsModal.tsx`, `isInvoicePaid` now recognizes 0-cost package sessions and completed sessions with 0 balance due (`sessionLeft <= 0 && (sessionPaid > 0 || isLaserPackage || totalPrice === 0 || booking.status === 'completed')`).
2. In `AdminBookingsView.tsx` and `ReceptionDashboardView.tsx` / reception API route, package-covered and completed 0-balance bookings evaluate to "Paid".

---

## DEC-085: Explicit Services Packages Are Never Reclassified As Pulses-Type By Name

**Date:** 2026-09-24
**Status:** Decided — active
**Note:** manually re-implemented from the classification-guard portion of commit `53e8fcf`
(`saifuldeennaser`, working in parallel on `origin/dev`) — see DEC-082's note. That commit's other
change (resolving `customer_packages.total_pulses` from `pkgMeta.totalPulses` / a package-name
regex when the real column is 0) was deliberately **not** taken: it reintroduces exactly the
fabricated-quota pattern Brief 34B (RISK-096) removed, and the commit's own new test asserted a
package named "5000 Laser Pulses" gets `total_pulses: 5000` written from the name alone. The quota
still comes from `packages.total_pulses` only, everywhere; an unconfigured pulses package is still
refused, not guessed.

**Context:**
A real services package (`package_type: 'services'`, has real `package_items`) whose name happens
to contain "laser" — e.g. "Laser Full Body 3x" — was misclassified as a pulses-type package by
`isPulsesPkg`'s name-matching fallback and rejected with "no pulse quota configured", since a
services package legitimately has `total_pulses = 0`.

**Decisions & Implementation:**
1. `src/app/api/packages/sell/route.ts`: added `isExplicitServicesPkg` (`packageItems.length > 0 &&
   package_type !== 'pulses' && pkgMeta?.packageType !== 'pulses'`), checked before the name-based
   pulses signals so an explicit, correctly-configured services package can never be overridden by
   them. `tests/routes/packages-sell.test.ts` covers it.
2. `src/components/admin/bookings/AdminNewBookingView.tsx`: the New Booking Option 3 catalog filter
   gets the same guard (an explicit `services`-type catalog package is included only if it actually
   has `total_pulses > 0`), and the generic `laser`/`ليزر` name keywords are dropped from the
   pulses-catalog heuristic (too broad — caused the same false positive client-side). Also surfaces
   the real server error message when a package sale fails during booking, instead of a generic
   alert.

---

## DEC-086: Real Historical Bookings Get Backfilled Invoices (Narrows DEC-026)

**Date:** 2026-09-25
**Status:** Decided — active. **Partially supersedes DEC-026** (the "no backfill machinery" clause, for real
historical bookings only).

**Context:**
DEC-026 (2026-07-25) built no backfill because every row then in the database was mock. That premise no
longer holds: reception now enters real past visits through `POST /api/reservations/previous` (rows with
`is_historical = true`). That route updates `customers.spent_amount` / `outstanding` / `wallet_balance` and
records a `transactions` payment row, but never writes `invoices` / `invoice_lines` / `payments`. So the
ledger-derived customer figures (`src/lib/customerBalances.ts`, `GET /api/customers/reconcile`) show those
customers as having no spend and no debt, disagreeing with the scalars, and anything valuing a customer from
the ledger under-reads every customer with pre-launch history. Production had 13 such bookings on
2026-09-25 (7 with a paid amount, 16,600 EGP in total).

**Decisions & Implementation:**
1. One-time, idempotent SQL script `scripts/backfill_historical_invoices.sql` (not a migration — it is data,
   run deliberately, per environment). For each `is_historical` completed booking with a customer and no
   invoice it writes one `issued` invoice (`issued_at` = the booking's completion date, single line), and one
   `payments` row when `amount_paid > 0`.
2. **Total** = `[Invoice Total]: N EGP` from `reception_notes` if present, else `amount_paid + amount_left`.
   Bookings whose total is 0 are skipped — there is nothing to value. The line description comes from the
   route's own `Service:` / `Package:` / `Product:` note tags and is suffixed `[historical backfill]`.
3. **Every backfilled invoice and payment is `is_opening = true`** (the DEC-024 import flag), and the revenue
   reports now honour it: `finance/pnl`, `trend`, `branch-pnl`, `service-mix`, `service-margin`, `doctor-pnl`,
   `cashflow` and the revenue part of `new-vs-returning` filter with `EXCLUDE_OPENING_INVOICES`
   (`src/lib/ledger.ts`; matches `is_opening` NULL or false — PostgREST `neq true` would drop NULL rows).
   Backfilled history therefore feeds customer value, `reconcile`, `receivables-aging`, `settle-debt` and the
   new-vs-returning first-invoice lookup, but never revenue, margin or cash-flow (no COGS/commission, predates
   the ledger). Audited 2026-09-25: no invoice reader honoured the flag before this.
4. **No `transactions` rows are written** — the previous-bookings route already recorded the cash side there;
   writing again would double-count cash.
5. `payments.method` is mapped into the CHECK set (card/instapay/wallet/transfer, else cash); the raw
   free-text method stays on the original `transactions` row.
6. **Update 2026-09-25:** `POST /api/reservations/previous` now writes the same invoice + payment itself
   (`src/lib/historicalInvoice.ts`, `writeHistoricalBookingInvoice`, same rules: `is_opening`, dated to the
   booking, total = entered value else paid, total 0 skipped, no `transactions` row). It is non-fatal — the
   booking, balances and transactions row are already saved — and the outcome is returned as
   `response.ledger` (`created` / `skipped` / `failed`) instead of being swallowed; the script remains the
   idempotent repair for any `failed`. A partly written invoice is deleted on failure.

**Verified (dev, 2026-09-25):** seeded historical bookings (paid in full, part-paid package, zero-value,
overpaid product); the ledger figures matched the customer row exactly (spent 2,200 = 2,200, outstanding
2,000 = 2,000), the overpaid booking counted as credit not debt, and re-running created no duplicates.
Checklist: `ai_docs/manual_tests/HISTORICAL_INVOICE_BACKFILL_MANUAL_TESTS.md`. **Not yet run on production.**

**Trade-offs:**
- Totals are only as good as what reception typed: with no `[Invoice Total]` the total falls back to what was
  paid, so an unpaid-but-owed old booking recorded without a total would not appear as a receivable.
- Backfilled invoices carry one summary line, not the original service/package/product breakdown.
- A new report that sums `invoices` must apply `EXCLUDE_OPENING_INVOICES` or it will count this history;
  `tests/routes/finance-opening-invoices.test.ts` guards the eight existing ones.



---

## DEC-087: Google Ads Laser Landing Pages Are Next.js Routes In This App, Not A Separate Vite/Manus Deployment

**Date:** 2026-09-25
**Status:** Decided — active.

**Context:**
Manus generated `revera-conversion-landing` (Vite + React + wouter + an Express static server, images served
from Manus's private `/manus-storage/`). Run as-is it would need its own host, and its logo and all three
photos were unrecoverable outside Manus (the files were never in the repo), so the pages shipped with a
broken logo and no images. It also loaded a Manus Umami script, pushed `dataLayer` events with no tag manager
to read them, and selected FAQ answers by `String.includes()` (three questions got the wrong answer).

**Decisions & Implementation:**
1. The pages live in this app so they deploy on the same Vercel host as the site: `/laser-tagamoa`,
   `/laser-tagamoa/dark-skin` (was `?h=dark`; a real path is CDN-cacheable and needs no `searchParams`),
   `/laser-men-tagamoa`, plus `/privacy` (the site had none). One server component,
   `src/components/landing/LaserLanding.tsx`, renders all three variants from `src/lib/landingCopy.ts`.
2. Styling is `src/components/landing/landing.css`, scoped under `.lp-shell` / `.lp-privacy`, using the
   brand tokens from `globals.css` (the Manus palette was already the brand palette). The only literal is the
   WhatsApp green. It explicitly neutralises three site-wide base rules that would hurt a paid page: the
   blur/delay section-entrance animation (delays LCP), the `a:hover`/`img:hover` lift, and the
   `[dir="rtl"] a[href^="tel:"] { display: inline-block; direction: ltr !important }` rule (it broke the call buttons).
3. Client-specific values moved to `src/config/client.ts` (`siteUrl`, `googleMapsUrl`, `instagramUrl`,
   `addressAr`, `googleRating`, `logoMarkPath`) per hard rule 2. Arabic campaign copy is in `landingCopy.ts`,
   **not** `translations.ts`, because the `Translation` type enforces en/ar parity and these pages are
   single-language ad copy.
4. Logo: the real brand mark (`main_logo.png`, trimmed to `public/images/landing/revera-mark.png`) plus a live
   text wordmark. Photos are real clinic assets (reception, doctor portrait), pre-optimised to WebP in
   `public/images/landing/`. The Manus AI-generated "consultation" people were dropped: they were presented as
   real clinic staff/clients.
5. `src/lib/landingPaths.ts` marks these routes as Arabic-only. `LanguageProvider` and the inline `DIR_SCRIPT`
   in `layout.tsx` skip them, so the ad URL is not rewritten to `?lang=en`, `<html lang>` is `ar`, no
   language cookie is set, and `/api/page-settings` is not fetched.
6. Tracking: `LandingTracker` (client) pushes `landing_view`, `whatsapp_click`, `call_click`, `map_click` and
   `scroll_depth` (25/50/75/90, once each — the Manus version fired once, mostly with depth "0") to
   `dataLayer` via `data-lp-event` attributes, and stores `gclid`/`gbraid`/`wbraid`/`utm_*` in sessionStorage.
   `LandingAnalytics` loads Google Tag Manager on these routes only, using `CLIENT.gtmId` (GTM-5ZXBL7LR; `NEXT_PUBLIC_GTM_ID` overrides, empty disables), plus the noscript iframe.
7. Copy changes (CRO review): removed absolute claims ("آمن لكل درجات البشرة", "من غير حروق", "من غير وجع");
   fixed masculine/feminine forms (the men page used feminine imperatives); the hero CTA no longer says
   "ابعتي «بشرتي»" when the WhatsApp text is already prefilled; the dark-skin variant now shows the dark-skin
   section directly under the hero (message match); "عميلة على Google" → "تقييم على Google" (two reviewers are men).

**Trade-offs:**
- The old `/` Manus route is gone (the main site owns `/`); ads must point at the three paths above.
- `revera-conversion-landing/` is now dead code and can be archived; it was not modified or deleted.
- Landing pages are indexable (canonical + OG set). Whether they should be `noindex` to avoid overlapping with
  future SEO pages is a marketing call, not made here.
- Open claims that need a human to confirm are tracked in RISK-103.

Checklist: `ai_docs/manual_tests/LASER_LANDING_PAGES_MANUAL_TESTS.md`.

---

## DEC-088: Laser-Pulse Package Revenue Is Recognised Per Pulse Consumed (Extends DEC-023)

**Date:** 2026-09-25
**Status:** Decided — active (2026-09-25); implementation starting. Owner decisions: item 5 = expiry option A,
item 6 = flag-and-enter (no catalog fallback), item 9 = cash and earned revenue shown side by side with the
deferred balance broken down. Items 1–4, 7, 8 and 10 follow from DEC-023 and the existing schema.

**Context:**
DEC-023 defers package cash as a liability and recognises revenue as sessions are delivered. That works only
for **services** packages: the DB function `consume_customer_package_session` writes a
`package_revenue_recognitions` row per session. **Pulses packages** (Brief 34B) keep their balance on
`customer_packages` (`total_pulses`, `pulses_used`, `pulses_remaining`) and are consumed through
`consume_package_pulses`, which writes no recognition. Production audit 2026-09-25 (RISK-104): all 6 packages
sold are pulses type (30,000 EGP) and `package_revenue_recognitions` has 0 rows, so the P&L's package revenue
is permanently 0 for laser while the cash (45,950 in September) shows in Cash Flow — September P&L revenue read
about 1,750 (products only). Two schema facts make this more than a one-line fix:
`package_revenue_recognitions.customer_package_item_id` is NOT NULL (and UNIQUE with `reservation_id`), but a
pulses package has no `customer_package_items`; and `reason = 'expiry_breakage'` exists in the CHECK but no
code writes it.

**Chosen Option:**
1. **Recognise revenue when pulses are consumed, in the same transaction and under the same row lock as the
   consume.** `consume_package_pulses` inserts the recognition itself, so it is atomic, idempotent (the
   existing `(customer_package_id, reservation_id)` replay path returns before any insert) and covers every
   caller — doctor consume, reception deficit resolution (BUY_NEW_PACKAGE), checkout — without touching them.
2. **Pro-rata by pulse range:** with `T(n) = least(price_paid, round(price_paid × n / total_pulses, 2))`, a usage
   row that consumed pulses `before+1 … before+qty` (ordered by `created_at, id` over **all** of the package's usage
   rows) is worth `T(before+qty) − T(before)`. The amount depends only on that range, so it is the same whether it is
   recognised live, in a backfill, or later once the row is linked to a booking or the price is confirmed — order of
   recognition does not matter — and the amounts telescope to exactly `price_paid` at depletion. The pulses variant
   deliberately does **not** round the per-pulse price first (as the session function does): 5,000 EGP over 3,000
   pulses would lose ~1% to rounding. (A first version summed only booking-linked pulses and lost a share when an
   orphan row was linked later — found in the live dev test and replaced.)
3. **Schema (new migration, additive):** make `customer_package_item_id` nullable; add
   `package_pulse_usage_id uuid REFERENCES package_pulse_usage(id) ON DELETE CASCADE`; add a `CHECK` that exactly
   one of the two sources is set; add `UNIQUE (package_pulse_usage_id)`; keep the existing
   `UNIQUE (customer_package_item_id, reservation_id)`. `reservation_id` stays NOT NULL for consumption rows
   (the P&L, branch and doctor reports join `reservations!inner` on it). Update `DB_SCHEMA.md` in the same
   change (CLAUDE.md rule 6).
4. **No report code changes.** `pnl`, `trend`, `branch-pnl`, `new-vs-returning`, `doctor-pnl` and
   `package-profitability` already sum `recognised_amount` by `recognised_at`; they show laser package revenue as
   soon as rows exist. Cash Flow is unaffected (cash is still recognised when received).
5. **Expiry (owner chose option A, 2026-09-25):** an unconsumed balance is recognised as revenue **at expiry**
   (`reason = 'expiry_breakage'`), because the obligation ends there; staff can still extend a package before it
   lapses. Not part of the first release: it needs `reservation_id` nullable (or a sibling table) and a scheduled
   or on-read sweep, and there is currently no expiry job. Until it ships, expired-unused balances stay deferred
   (a conservative understatement, never an overstatement).
6. **Historical packages (owner decision 2026-09-25): never guess the price — flag it and let staff enter it.**
   `POST /api/reservations/previous` used to create the customer's package with `price_paid = catalog price`
   whatever was actually charged. New rule: if the receptionist entered an invoice value for a historical package
   booking, that value is the package's `price_paid`. If they did **not**, the package is created with
   `price_pending = true` (new boolean on `customer_packages`) instead of falling back to the catalog price.
   While pending: no revenue is recognised for that package (its consumption is still recorded, so nothing is
   lost), and the booking and the customer's package show an "Invoice value missing" badge. A per-booking
   **"Enter invoice value"** action (reception/admin, on that historical booking only) opens a small dialog that
   **pre-fills the catalog price as a suggestion, never as the saved value** — staff must confirm or change it.
   Saving it (a) sets `price_paid` and clears `price_pending`, (b) updates the booking's ledger invoice and line to
   the entered value, (c) applies the debt/wallet difference to the customer (`entered value − amount paid`, the
   same settlement rule the route uses at entry), and (d) runs the recognition catch-up for the pulses already
   consumed (item 8's logic, per package). The action is idempotent and refuses to run twice with a different
   value unless the user explicitly edits. The cash for these packages predates the ledger and is excluded from
   Cash Flow by `is_opening`, so their recognised revenue has no matching cash inside the ledger period —
   accepted; that is what opening deferred revenue means. Scope: **packages only** — a non-package historical
   booking with no entered value keeps the DEC-086 fallback (invoice = amount paid), which cannot misstate
   revenue because it equals the cash received.
7. **Reversals:** no code path un-consumes pulses today. Any future restore/correction must delete or negate
   that consumption's recognition inside the same transaction (`ON DELETE CASCADE` on `package_pulse_usage_id`
   covers a deleted usage row). Recorded here so it is not forgotten when one is added.
8. **Backfill:** a one-time, idempotent script (same style as `backfill_historical_invoices.sql`, with a separate
   SELECT-only dry run) creates the missing recognitions for existing `package_pulse_usage` rows, ordered by
   `created_at` per package so the cumulative amounts come out identical to live consumption. Production had one
   usage row at audit time, so the historical effect is negligible — the change matters going forward.

9. **Finance presentation (owner decision 2026-09-25): show cash and earned revenue side by side, and explain the
   difference on the screen.** The clinic owner must never see "50,000 came in, revenue 10,000" without the reason.
   - P&L gets a **bridge** under the revenue figure: `Cash received (Cash Flow) − paid for packages not yet
     delivered (deferred) + earned this period from earlier deferred packages = Revenue earned`.
   - A **Deferred package balance** card (money collected for services not yet delivered) with a **breakdown by
     what it is owed for**: pulses (total pulses remaining and the amount), and per service the sessions remaining
     and the amount (e.g. "40,000 EGP = 30,000 pulses + 5 Underarm sessions + 6 Full Body sessions"). Per package:
     `deferred = price_paid × remaining / total` (DEC-023 pro-rata; for a services package the amount is split
     across its items by remaining sessions). Packages with `price_pending` (item 6) are listed separately as
     "invoice value missing", not silently counted as 0.
   - Labels are explicit in Arabic and English: **"Cash received / المقبوض"** for Cash Flow and **"Revenue earned /
     الإيراد المُحقَّق"** for the P&L — never two screens that both just say "revenue".
   - Data source: `customer_packages` (`price_paid`, `total_pulses`, `pulses_remaining`, `status`, `expires_at`) and
     `customer_package_items` (`qty_remaining`, `service_id`); nothing new is stored for this.
10. **Consumption without a booking.** `package_revenue_recognitions.reservation_id` stays NOT NULL (every revenue
    report joins `reservations!inner` for branch and doctor). A pulse consumption with no `reservation_id` (a manual
    deduction from the patient profile, or a backfilled legacy row) therefore recognises **no** revenue; it is
    counted in the deferred figure and shown in the breakdown as "consumed without a booking — link it to
    recognise". Production had none at audit time (1 usage row, with a booking); dev has 10 legacy rows, all
    without one. Chosen over a nullable column because that would silently drop the revenue from the branch and
    doctor reports instead of surfacing it.

**Reason:**
- Without it the P&L is wrong in the direction DEC-023 was written to prevent: laser package cash never becomes
  revenue, so margin and every revenue report understate the clinic's largest product line.
- The consume function is the only place that already holds the lock and the idempotency key; a second write
  from application code would reintroduce the ordered-not-transactional risk RISK-097 documents.
- Pro-rata on pulses mirrors DEC-023 exactly and is explainable to a non-specialist.

**Trade-offs:**
- Reported revenue for laser packages shifts from "at sale" (currently never) to "as delivered": months that sell
  many packages look lower than cash, months that deliver them look higher — the intended effect, but numbers
  will change for anyone comparing to old reports.
- Recognition is only as good as `price_paid`; for pulses packages sold through `/api/packages/sell` that is the
  catalog price at sale, which already includes any discount applied there.
- A consumed pulse is recognised even if the visit is later cancelled, until a reversal path exists (item 7).

**Verification plan (live, dev database — the in-memory fake cannot run PL/pgSQL):** consume in several steps and
confirm `Σ recognised = price_paid` exactly at depletion; replay the same reservation and confirm no second row;
concurrent consumes serialise; clamp at remaining; a package with `total_pulses = 0` still refuses; the `pnl`
route's package line moves and Cash Flow does not; function grants unchanged (service_role only). Manual
checklist `ai_docs/manual_tests/PULSE_REVENUE_RECOGNITION_MANUAL_TESTS.md` to be created with the code.
