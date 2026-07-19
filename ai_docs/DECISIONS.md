# DECISIONS.md — Revera Clinics Decision Log

> **Last Updated:** 2026-06-26
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

## DEC-007: Renaming Providers to Doctors and Multi-Shift Schedules

**Date:** 2026-07-18
**Status:** Decided — active

**Context:**
The clinic has medical professionals. We decided to rename the label "Providers" to "Doctors" across all admin/public labels. Additionally, doctor calendars must support multiple shifts per day rather than a single start/end time.

**Reason:**
- "Doctors" is more natural and patient-centric than "Providers" for a clinic.
- Doctors frequently work split shifts (e.g. morning and evening slots) on a single day.

---

## DEC-008: Real Database-Backed HR Modules

**Date:** 2026-07-18
**Status:** Decided — active

**Context:**
All HR features (Payroll, Leaves, Attendance, Performance Reviews, Targets) were previously mock sections using static frontend constants. We implemented real PostgreSQL tables and Next.js backend routes to persist and run HR processes.

**Reason:**
- Moves the application from a mock clone to a production-ready internal CRM system.

---

## DEC-009: Customer Profile Inline Full-Page Navigation

**Date:** 2026-07-18
**Status:** Decided — active

**Context:**
The customer details view and customer creation forms were previously rendered inside a fixed modal/drawer overlay. We refactored them to render inline within the main admin panel layout using back-navigation.

**Reason:**
- Enhances visual space for editing and viewing deep patient medical profiles and history.

---

## DEC-010: Custom Target Metrics and Bonus Calculations

**Date:** 2026-07-19
**Status:** Decided — active

**Context:**
Target goals for employees were limited to a count of reservations, and bonuses were fixed at a percentage of basic salary. We introduced customizable target metrics (`reservations` or `revenue` in EGP) and bonus calculations (`percentage` of basic salary or a `fixed` money reward).

**Reason:**
- Fits varying compensation strategies for receptionists vs medical staff.
