# DECISIONS.md — Revera Clinics Decision Log

> **Last Updated:** 2026-07-20
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
- Allow `superadmin` and `admin` roles to bypass the check (enforced client-side).

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
