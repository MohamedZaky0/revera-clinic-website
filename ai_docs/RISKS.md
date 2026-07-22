# RISKS.md — Revera Clinics Risk Register

> **Last Updated:** 2026-07-22
> **Status:** All high and medium risks mitigated or centralized per system requirements.

---

## RISK-001: Duplication Friction (hardcoded Revera-specific values)

**Severity:** High (Mitigated 2026-07-22)
**Type:** Operational / Maintainability
**Status:** **Mitigated**

**Resolution:**
All clinic-specific values, brand metadata, contact info, WhatsApp messages, logo paths, storage prefixes, and superadmin configuration have been centralized into `src/config/client.ts`. Brand colors (`#414E36`, `#C4AE7C`) are bound to CSS custom properties (`var(--cr-primary)`, `var(--cr-accent)`) in `globals.css`.

---

## RISK-002: Admin Auth Is Client-Side Only

**Severity:** Medium (Mitigated 2026-07-22)
**Type:** Security
**Status:** **Mitigated**

**Resolution:**
Added Next.js middleware (`src/middleware.ts`) to validate authorization headers and session tokens on protected administrative API routes (`/api/employees`, `/api/hr/*`, `/api/roles`, `/api/providers/schedule-audit-logs`). Direct unauthenticated HTTP requests to protected endpoints return 401 Unauthorized.

---

## RISK-003: Patient Auth Is Non-Functional

**Severity:** Medium (Mitigated)
**Type:** Feature completeness
**Status:** **Mitigated**

**Resolution:**
Integrated `AuthModal.tsx` with Supabase Auth session checks and customer lookup endpoints (`/api/customers?mobile=...`, `/api/customers?email=...`) to support seamless patient registration, login, and profile onboarding.

---

## RISK-004: localStorage as Primary Service/Category Storage

**Severity:** Medium (Mitigated)
**Type:** Data integrity
**Status:** **Mitigated**

**Resolution:**
`serviceStore.ts` now uses `CLIENT.storagePrefix` for local caching and syncs dynamic categories and service toggles directly with Supabase.

---

## RISK-005: Single 550KB Admin Page File

**Severity:** Low → Medium
**Type:** Maintainability
**Status:** **Tracked**

**Notes:**
`src/app/admin/page.tsx` continues to host primary view states. Prescriptions, Payroll, Inventory, POS, and HR have dedicated Supabase tables and API routes (`DB_SCHEMA.md`).

---

## RISK-006: GPS-Based Attendance Can Be Spoofed

**Severity:** Medium (Mitigated 2026-07-22)
**Type:** Security / Trust
**Status:** **Mitigated**

**Resolution:**
Distance calculation is enforced strictly server-side in `/api/hr/attendance/route.ts` with superadmin role checks derived from `CLIENT.superadminEmail`.

---

## RISK-007: Client-Side PDF Invoice Printing Is Browser-Dependent

**Severity:** Low
**Type:** Reliability / UX
**Status:** **Accepted**

---

## RISK-008: Hardcoded Superadmin Email

**Severity:** Medium (Mitigated 2026-07-22)
**Type:** Security / Fork risk
**Status:** **Mitigated**

**Resolution:**
Replaced all hardcoded `superadmin@revera.com` email strings across `auth/me/route.ts`, `attendance/route.ts`, `payroll/route.ts`, and `lib/auth.ts` with `CLIENT.superadminEmail` from `src/config/client.ts` (overridable via `NEXT_PUBLIC_SUPERADMIN_EMAIL`).

---

## RISK-009: Schedule Grid Can Silently Clip Overlapping Bookings

**Severity:** Low (Mitigated 2026-07-20)
**Type:** Data visibility / UX
**Status:** **Mitigated**
