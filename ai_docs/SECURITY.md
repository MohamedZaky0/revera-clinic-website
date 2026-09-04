# SECURITY.md — Current Security Posture

> **Last Updated:** 2026-08-03
> **Audited from:** `src/middleware.ts`, `src/lib/access.ts`, every `src/app/api/**/route.ts`,
> `supabase/migrations/`, and `ai_docs/RISKS.md`.
> **Purpose:** a single, current answer to "is X protected, and how" — so nobody has to re-derive
> it from `RISKS.md`'s narrative history. `RISKS.md` is the *log* (what was broken, when, why it
> was fixed); this file is the *snapshot* (what's true right now). If they disagree, trust this
> file's code references over this file's prose, and re-audit rather than assuming either is right.

---

## 1. Auth model, in one picture

There is **one identity system** (Supabase Auth) serving **two very different kinds of caller**,
and the codebase does not always distinguish them cleanly:

- **Staff** (superadmin/admin/other roles) — logs in via email+password on `/admin`. Has a row in
  `employee_accounts` linked by `auth_user_id`, and a role in `roles` with a `permissions` array.
- **Patients** — logs in via phone/OTP (`AuthModal`), for real, through Supabase Auth (RISK-003 was
  the *fake* version of this and is resolved). A patient is **also** an "authenticated Supabase
  user" with a valid JWT — just not a staff member.

**The critical distinction most routes need to make and don't always make:** *"has a valid
Supabase session"* ≠ *"is staff."* A patient's token passes `requireAuthenticatedUser` and the
middleware's bearer-token check just as validly as a staff member's does.

Three server-side helpers exist in `src/lib/access.ts`:

| Helper | Proves | Does NOT prove |
|---|---|---|
| `requireAuthenticatedUser(req)` | Token is a valid, unexpired Supabase session | Staff, role, or ownership of anything |
| `requireStaffAccess(req)` | Caller has an `employee_accounts` row (any role) | Which role — caller may still be low-privilege |
| `requireAdministratorAccess(req)` | Caller's role is `admin` or `superadmin` | Finance-specific permission — see `hasFinancePermission` |

`hasStaffPermission(access, perm)` treats **every** `admin`/`superadmin` as having every staff
permission — it cannot express "admins may not see X." `hasFinancePermission(access, perm)` is
the one exception: only `superadmin` or an explicit permission grant passes, `admin` alone does not.

Patient-facing routes (`/api/customers`) use a different, narrower check:
`isOwnIdentity()` in `src/lib/customerIdentity.ts` — a patient may read/write **their own** record
(matched via `customers.auth_user_id`, falling back to normalized phone/email for pre-migration
rows), never anyone else's. This is deliberately not `requireStaffAccess` — patients are supposed
to be able to call this route.

---

## 2. `src/middleware.ts` — what it actually covers

```ts
const PROTECTED_API_PREFIXES = [
  '/api/employees',
  '/api/hr/',
  '/api/roles',
  '/api/providers/schedule-audit-logs',
];
```

For paths under these four prefixes, middleware requires a **valid Supabase bearer token** —
nothing more. It does **not** check role. A patient's real, valid OTP session token satisfies this
middleware just as well as a staff token would.

- `/api/employees` and `/api/roles` also have their own route-level `requireAdministratorAccess`/
  `requireStaffAccess` calls, so they're actually role-gated in practice — middleware is a second
  layer there, not the only one.
- **`/api/hr/*` (alerts, attendance, doctor-payroll, leaves, payroll, performance) and
  `/api/providers/schedule-audit-logs` have no route-level role check at all.** Middleware proves
  "some logged-in Supabase user," which today includes any patient who has completed OTP login.
  This is a real, currently-open gap, not a resolved one — see §4.

Every other path under `/api/*` gets **no middleware protection whatsoever**. Whatever
authorization exists for those routes is entirely up to the individual route handler.

---

## 3. Per-route authorization — the real, current inventory

Grounded in a direct grep of all 69 `route.ts` files for `requireStaffAccess` /
`requireAdministratorAccess` / `requireAuthenticatedUser` / `isOwnIdentity`, done 2026-08-03.

### 3a. Server-side role-gated (import a helper from `access.ts`, route level)
`assets`, `assets/post-depreciation`, `customers` (identity-scoped, not blanket), `customers/package-redemptions`,
`customers/packages`, `customers/products`, `customers/reconcile`, `employees`, `employees/notes`,
`expenses`, `expenses/categories`, `expenses/generate-due`, `expenses/recurring`,
`finance/*` (all 12 sub-routes), `inventory/devices` (+ `[id]/reset-pulses`, `audit-logs`),
`inventory/products` (+ `reconcile`), `inventory/products/sales`, `loans`, `packages` (+ `consume`,
`extend`, `sell`), `purchases`, `reservations` (staff-only for every mutating action except the
one deliberately-anonymous deposit self-report — see RISK-018), `roles`, `service-consumables`,
`service-devices`, `services`, `suppliers`.

### 3b. Middleware-only (authenticated-user check, no role check)
`hr/alerts`, `hr/attendance`, `hr/doctor-payroll`, `hr/leaves`, `hr/payroll`, `hr/performance`,
`providers/schedule-audit-logs`. **Any authenticated Supabase user — including a patient — passes.**

### 3c. No auth of any kind (open to the public internet, method-by-method)

| Route | Methods | Risk if abused |
|---|---|---|
| `medical-records` | GET/POST/DELETE | **PHI.** Anyone who knows/guesses a `customer_id` can read, overwrite, or delete another patient's medical intake form and uploaded reports. |
| `prescriptions` | GET/POST/DELETE | **PHI.** Same shape of exposure — diagnosis, medication, follow-up per customer. |
| `branches` | GET/POST/DELETE | Anyone can create/delete clinic branches. |
| `categories` | GET/POST/DELETE | Anyone can create/delete service categories. |
| `providers` | GET/POST/PATCH/DELETE | Anyone can create/edit/delete doctor records. |
| `rooms` | GET/POST/PATCH/DELETE | Anyone can create/edit/delete physical rooms. |
| `service-rooms` | GET/POST | Anyone can rewrite which rooms a service can use. |
| `terms` | GET/POST/PUT/DELETE | Anyone can rewrite the public Terms & Conditions text. |
| `clinic-settings` | GET/POST | Anyone can overwrite CMS content (defacement). |
| `page-settings` | GET/POST | Same — this is the underlying store `clinic-settings` aliases. |
| `customer-avatars` | GET/POST | Anyone can overwrite any customer's avatar image. |
| `provider-attendance` | GET/POST | Anyone can forge a doctor check-in/out record. |
| `translate` | POST | If this proxies a paid third-party translation API, it's an open cost-abuse vector. |
| `availability` | GET | **Intentionally public** — the public booking widget needs slot availability with no login. |
| `auth/me`, `auth/employee-email` | GET | Auth-support routes; validate the token they're given internally. Not a blanket data-exposure risk on their own, but worth re-checking if their internal logic changes. |
| `health/supabase` | GET | Env/diagnostics endpoint. Low sensitivity, but there's no reason it needs to be reachable in production — consider gating or removing before a real client goes live. |

**This table is new as of this audit (2026-08-03) — it is not yet logged in `RISKS.md`.**
`RISKS.md` → RISK-018 documented the *finance-relevant* unauthenticated routes and their fix; it
never covered `medical-records`, `prescriptions`, or the config/CMS routes above, because the
original 2026-07-25/26 pass was scoped to money-mutating routes only. The medical-records and
prescriptions rows are the ones that matter most — PHI with zero server-side authorization. **This
should get its own `RISKS.md` entry (next number: RISK-036) before it's treated as "known and
accepted"; it is currently just "known."**

---

## 4. Row-Level Security (RLS)

- `supabase/migrations/20260722140000_enable_row_level_security.sql` turns RLS **on** for every
  table in `public`, with **no policy added** — meaning direct anon-key table access is denied by
  default, and every legitimate access path must go through `supabaseServer` (the service role
  key, which bypasses RLS entirely).
- **RLS is a backstop against accidental direct client-side table access, not an authorization
  layer.** Because every API route uses the service role key, RLS enforces nothing about *who*
  can call a route — that's entirely `access.ts` / middleware's job (§1–§3). A route with no
  role check has full read/write to its table regardless of RLS being "on."
- **Residual permissive policies:** per `RISKS.md` RISK-019, a subset of tables (`roles`,
  `employee_accounts`, `hr_*`, `employee_notes`, `prescriptions`, `inventory_*`, `product_sales`,
  `device_maintenance_history`, `admin_roles`) still carry pre-2026-07-25 "allow all" policies from
  older migrations, layered underneath the blanket enable. These are functionally open to the
  anon key. Nothing in the current app calls Supabase with the anon key for table access anymore
  (confirmed by RISK-019's audit), so this is currently latent rather than exploited — but it means
  a future client-side Supabase call to one of those tables would silently succeed instead of
  being denied. Tightening/dropping those old permissive policies is still open work.
- **New tables must enable RLS explicitly in their own migration.** The blanket-enable migration is
  a one-shot `DO` loop over tables that existed *at the time it ran* — it is not a trigger and does
  not apply retroactively to tables created later. See `supabase/migrations/README.md` and the
  `20260725120000_backfill_...` migration (`ai_docs/DB_SCHEMA.md`) for the pattern to copy:
  `ALTER TABLE public.<new_table> ENABLE ROW LEVEL SECURITY;` with no policy.

---

## 5. Secrets and environment variables

- Real secrets live in `.env.local` (gitignored — confirmed only `.env.local.example` is tracked).
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, full table bypass via `src/lib/supabaseServer.ts`) is
  never exposed to the browser — it has no `NEXT_PUBLIC_` prefix, and only server-side code
  (API routes, `middleware.ts` uses the anon key instead, correctly) imports `supabaseServer`.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are, by design, public — they're
  meant to be shipped to the browser. Their safety depends entirely on RLS + policy correctness
  (§4), which is why the residual permissive-policy gap above matters more than it would if the
  anon key were meant to stay secret.
- No other third-party API keys were found wired into committed code at time of audit; if one is
  added (e.g. a real SMS/OTP provider, the `translate` route's backing service), it must go through
  the same `.env.local`-only pattern, never a hardcoded string.

---

## 6. Known-accepted gaps (deliberate, not oversights)

- **Patient OTP auth (`AuthModal`) is real Supabase Auth**, not client-side simulation — but there
  is still no first-class "patient session" concept distinct from "staff session" anywhere in
  `access.ts`. Every route has to reason about this itself (see §1). A `requirePatientAccess` /
  `requireOwnIdentity`-style helper generalized beyond `/api/customers` would close this class of
  bug at the root instead of per-route.
- **GPS attendance spoofing (RISK-006):** server validates coordinate bounds/accuracy and binds the
  check-in to the authenticated employee, but cannot detect a spoofed-but-plausible location. Open;
  would need signed/attested check-in tokens to fully close.
- **`/admin` itself has no server-side gate** — it is a client component that checks
  `supabase.auth.getSession()` on mount and renders a login form if absent. This is fine *only*
  because every sensitive read/write it triggers goes through an API route, and those routes are
  where real authorization must live (§3). Do not treat the `/admin` login screen itself as a
  security boundary — per `CLAUDE.md` rule 3, assume no middleware protects `/api/*` unless you've
  checked this file.

---

## 7. Checklist for adding a new API route

1. Decide which of the three buyer classes it serves: staff-only, patient-self-service, or
   genuinely public (CMS reads, availability). Default to staff-only unless you have a specific
   reason it must be public.
2. Staff-only → call `requireStaffAccess` or `requireAdministratorAccess` at the top of every
   handler, not just `GET`. A route that gates `POST` but not `DELETE` is still an open route.
3. Patient-facing → do not reuse `requireStaffAccess`. Scope by identity
   (`isOwnIdentity` pattern in `src/lib/customerIdentity.ts`), and double-check financial/sensitive
   fields aren't patient-writable regardless of what the request body contains (RISK-018's
   `/api/customers` fix is the template).
4. If it touches money, inventory counts, or PHI (medical records, prescriptions) and isn't
   staff-gated yet, that's a bug — file it in `RISKS.md`, don't leave it implicit.
5. New table → new migration must include
   `ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;` with no policy (§4). Update `DB_SCHEMA.md`
   in the same change per `CLAUDE.md` rule 6.
6. Adding it to `PROTECTED_API_PREFIXES` in `middleware.ts` proves authentication only — it is
   never sufficient on its own for a route that needs role-based authorization (§2).
