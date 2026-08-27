# DECISIONS.md — Revera Clinics Decision Log

> **Last Updated:** 2026-08-27 (DEC-045)
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
