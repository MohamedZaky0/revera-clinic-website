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
