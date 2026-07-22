# DECISIONS.md — Revera Clinics Decision Log

> **Last Updated:** 2026-07-22
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

