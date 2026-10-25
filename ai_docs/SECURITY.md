# SECURITY.md — Current Security Posture

> **Last Updated:** 2026-10-21. Full re-audit against `dev`: §2 and §3 rebuilt from a scan of every route
> handler (the HR gap listed here until now had been closed since 2026-08-16), §4 records that the RISK-128
> migration is applied on dev and production.
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

Server-side helpers (`src/lib/access.ts` unless noted):

| Helper | Proves | Does NOT prove |
|---|---|---|
| `requireAuthenticatedUser(req)` | Token is a valid, unexpired Supabase session (still checked with one `auth.getUser` call to the Auth server per request, RISK-134) | Staff, role, or ownership of anything |
| `requireStaffAccess(req)` | Token verified locally by `verifyAccessToken` (RISK-134), then caller has an **active** `employee_accounts` row (any role); an inactive account is refused (DEC-117) | Which role — caller may still be low-privilege |
| `requireAdministratorAccess(req)` | Caller's role is `admin` or `superadmin` | Finance-specific permission — see `hasFinancePermission` |
| `requireSuperadminAccess(req)` | Caller's role is `superadmin` | — |
| `requireFinanceAccess(req, anyOf)` | `superadmin`, or a staff member holding one of the listed `finance.*` permissions | — |
| `verifyHrAccess(req)` (`src/lib/auth.ts`) | Token verified locally by `verifyAccessToken` (RISK-134); active registered staff whose role is `superadmin`, `admin` or `hr` | Finance permission; any other role is refused with 403 |
| `requireReceptionAccess(req)` (private to `api/reception/dashboard`) | Staff whose role is one of the reception / HR roles the dashboard allows (RISK-059) | — |

**How a bearer token is verified (RISK-134, `src/lib/verifyToken.ts`).** `requireStaffAccess`, `verifyHrAccess` and
`GET /api/auth/me` no longer call the Supabase Auth server on every request. They call `verifyAccessToken(token, supabaseServer)`,
which uses `auth.getClaims()`:

- **ES256/RS256 token with a `kid`** (the project's current signing key, ECC P-256 on production since about 2026-06): the signature is
  checked locally against the project's JWKS (`/auth/v1/.well-known/jwks.json`, fetched once and kept about 10 minutes per server process).
  No Auth-server call per request.
- **Legacy HS256 token, no `kid`, empty JWKS, or a `kid` the JWKS does not list**: `getClaims` falls back to one `auth.getUser` call.
  The helper keeps a bounded in-memory cache (500 entries, key = SHA-256 of the token, 60 s or the token's own expiry, whichever is
  sooner) and shares one call between concurrent requests with the same token, so this costs at most one Auth call per token per minute
  per server instance. A cache hit never reaches the Auth server.
- `getClaims` itself checks only the signature and `exp`. The helper additionally requires `iss = <NEXT_PUBLIC_SUPABASE_URL>/auth/v1`,
  `aud = authenticated`, `role = authenticated`, `is_anonymous` not true and a well-formed `sub`; it maps every exception `getClaims` can
  throw on a malformed token to "invalid" (401); and it maps an unreachable or failing Auth/JWKS endpoint (network error, 429, 5xx) to
  "unavailable" (503, RISK-113: the client keeps the session). Unknown key ids are rate-limited (5 distinct per minute, 60 s cooldown).
- **A token proves who the caller is, not that they may still act.** The `employee_accounts` lookup (`is_active`, role) is a database read on
  every request and is unchanged, so deactivating a staff member (DEC-117) still takes effect on the very next request. What a locally
  verified token does not see is a revoked *session* (sign-out elsewhere, a banned auth user): an ES256 access token stays acceptable until
  its own `exp` (default 1 hour). For staff that is covered by the database check above; `email` in `StaffAccess.user` is the token's
  snapshot (the email-fallback employee match uses it).
- `requireAuthenticatedUser` (patient identity in `/api/customers`) deliberately still uses `auth.getUser`: it has no database gate and
  `isOwnIdentity` compares the live email/phone.

`hasStaffPermission(access, perm)` treats **every** `admin`/`superadmin` as having every staff
permission — it cannot express "admins may not see X." `hasFinancePermission(access, perm)` is
the one exception until RISK-078/A10: only `superadmin` or an explicit permission grant passes,
`admin` alone does not. `hasGranularPermission(access, permKey)` (added for RISK-078/A10, 2026-09-07)
follows the same stricter shape — `superadmin` bypasses, `admin` does not automatically — and mirrors
the coarse-category + create/edit/delete fallback chains from the client's `hasPermission()` for
`providers`/`services`/`inventory`/`customers`, so a role granted the coarse category in Role
Management (every pre-existing role, including the live `admin` accounts) keeps working exactly as
it did under the old any-staff guard.

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

For paths under these four prefixes, middleware requires a **well-formed, unexpired bearer token** —
nothing more (RISK-134): a 3-part JWT whose `exp` has not passed. It makes **no network call** and does **not**
verify the signature (before RISK-134 it called `/auth/v1/user` on every request, which doubled the Auth-server
load); the signature, issuer, audience and the employee row are checked by the route handler (below). It does
**not** check role. A patient's real, valid OTP session token passes this middleware just as a staff token would.

- Every one of these also has route-level checks, so middleware is a second layer, not the only one:
  `/api/employees` and `/api/roles` use `requireAdministratorAccess` (`PATCH /api/roles` is
  `requireSuperadminAccess`); `/api/hr/*` uses `verifyHrAccess` for every read and every management write, and
  `requireStaffAccess` only for the three self-service writes (attendance check-in, a leave request, a missing-check-in
  alert); `/api/providers/schedule-audit-logs` uses `requireStaffAccess`. A patient token therefore passes
  middleware but is refused by the handler (RISK-036 re-audit 2026-08-16, RISK-063).

Every other path under `/api/*` gets **no middleware protection whatsoever**. Whatever
authorization exists for those routes is entirely up to the individual route handler.

---

## 3. Per-route authorization — the real, current inventory

Rebuilt 2026-10-21 by scanning the 84 route handlers on `dev` for the helper each exported method calls, then
reading the ones that matter. The table is per method; the RISK numbers say when and why a gate was added.
Re-run the scan after adding a route (see §7).

### 3a. Public on purpose (no session needed)
| Route | Methods | Why |
|---|---|---|
| `availability` | GET | The public booking widget needs slot availability with no login. |
| `branches`, `categories`, `services`, `providers`, `rooms`, `service-rooms`, `packages`, `terms` | GET | Catalog and clinic information the public site and the booking flow read. `packages` returns the whole catalog (including inactive and not-on-website packages) and `providers` returns the full provider row; nothing secret, but wider than the site strictly needs. |
| `customer-avatars` | GET | Avatar URL map keyed by patient id; no names. POST is `requireStaffAccess`. |
| `provider-attendance` | GET | Returns the day's provider check-in/out rows to anyone who passes `?date=`. **Not documented as intentional anywhere before this audit** (see §6). POST is `requireStaffAccess`. |
| `page-settings` | GET | Dual-mode: staff get the full blob, everyone else gets `stripInternalFields()`'d public CMS content (RISK-067). |
| `auth/me` | GET | Validates the bearer token it is given and answers 401 / 503 itself (RISK-113). |
| `auth/employee-email` | GET | **Accepted, not fixed (RISK-080).** Load-bearing for the `/admin` sign-in flow: it resolves an employee ID to an email *before* any session exists, so a session guard would lock out every staff login. Remains an enumeration surface (employee IDs to staff emails — useful for phishing); an email alone grants no access, and Supabase Auth rate-limits the password endpoint it feeds. Revisit if staff report targeted phishing. |

### 3b. Staff only (`requireStaffAccess`, any role)
Whole route unless a method is named: `categories` (POST, DELETE), `clinic-settings` (GET), `customer-avatars` (POST),
`customers/package-redemptions`, `customers/packages`, `customers/reconcile`, `customers/settle-debt`,
`inventory/devices/audit-logs`, `inventory/devices/[id]/reset-pulses`, `inventory/products/reconcile`,
`inventory/products/sales`, `invoices`, `laser-pulses`, `medical-records` and `medical-records/templates` (PHI; RISK-080),
`packages` (POST, PATCH, DELETE) and `packages/consume|extend|sell`, `prescriptions` (PHI; RISK-080), `profile`,
`profile/attendance`, `profile/payroll`, `provider-attendance` (POST), `providers/schedule-audit-logs`, `purchases`,
`reservation-products`, `reservations/previous` (GET, POST, PATCH — real patient names and phones; RISK-080),
`reservations/laser-deficit`, `reservations` (PATCH), `rooms` (POST, PATCH, DELETE), `service-consumables`,
`service-devices`, `service-rooms` (POST), `suppliers`, `translate` (POST; proxies to Google Translate).

`reception/dashboard` additionally requires a reception / HR role (`requireReceptionAccess`, RISK-059).

The three `profile*` routes (RISK-128 follow-up, 2026-10-21) return only the **caller's own** employee row, attendance and
payroll figures. They take no employee id from the request: the identity comes from the bearer token, and the provider row is
matched strictly (id, phone, national id, or exact normalised name; exactly one match or none). Do not turn them into
"look up anybody" routes; `/api/employees` and `/api/hr/*` are the admin / HR versions.

### 3c. Staff plus a granular permission (`hasGranularPermission`, RISK-078 / A10)
`providers` (POST, PATCH; DELETE is **superadmin only** since commit `0976a72`, 2026-09-10), `services` (POST, DELETE),
`inventory/products` (POST, PUT, DELETE), `inventory/devices` (POST, PUT), `customers/products` (POST, PATCH),
`transactions` (POST). Passing `requireStaffAccess` is not enough: the handler also checks the specific action permission
Role Management shows (e.g. `providers.delete`, `inventory.manage_devices`). `superadmin` bypasses; `admin` does not
automatically. The coarse-category and create/edit/delete fallback chains mirror the client's `hasPermission()`, so a role
granted the coarse category keeps working. The GET methods of `inventory/products` and `inventory/devices` stay
`requireStaffAccess`.

### 3d. Finance permission
`expenses`, `expenses/categories`, `expenses/recurring`, `expenses/generate-due`, `assets`, `assets/post-depreciation` and
`loans` use `requireFinanceAccess(req, [...])` (RISK-107): GET needs `finance.manage_<x>` **or** `finance.view_pnl`,
writes need `finance.manage_<x>`. `superadmin` always passes; a plain `admin` needs the grant (DEC-022).
Every `finance/*` route (16, including `capacity`, `deferred-packages`, `revenue-bridge` and `service-mix`) and `transactions`
(+ `audit-logs`) is `requireStaffAccess` plus `hasFinancePermission` with the permission named in the handler (for example
`finance.view_pnl`, `finance.view_margins`, `finance.view_capacity`; the Reports screens also accept the matching `reports.*`
permission). `budget-vs-actual` accepts `finance.manage_expenses` or `finance.view_pnl` (RISK-107).

**Role names match exactly (RISK-109, 2026-09-29):** `access.ts` treats a role as `superadmin`/`admin` only when its name,
lowercased with spaces/underscores/hyphens removed, equals exactly `superadmin`/`admin`. It previously accepted any name
containing "super", so a custom "Supervisor" role was the owner.

### 3e. Administrator (`requireAdministratorAccess`, admin or superadmin)
`employees` (all methods) and `employees/notes`, `roles` (GET, POST, DELETE), `branches` (POST, DELETE — RISK-080),
`clinic-settings` (POST), `page-settings` (POST — RISK-067), `terms` (POST, PUT, DELETE — RISK-080), `health/supabase`
(RISK-080; reports presence and source variable name only, it used to leak the first characters of the service-role key).
Superadmin only: `roles` (PATCH), `customers` DELETE and `reservations` DELETE (soft and hard; an `admin` is refused —
commit `0976a72`), `providers` DELETE. `employees` and `roles` deliberately have no granular layer (RISK-069).

### 3f. HR (`verifyHrAccess`: superadmin, admin or hr)
`hr/payroll`, `hr/doctor-payroll` and `hr/performance` (every method), and the management methods of `hr/alerts` (GET, PATCH),
`hr/leaves` (GET, PATCH), `hr/attendance` (GET). The self-service writes — `hr/attendance` POST and PATCH (check-in /
check-out, bound to the authenticated employee), `hr/alerts` POST, `hr/leaves` POST — need only `requireStaffAccess`, so
a receptionist can clock in but cannot read anyone's payroll (RISK-036 re-audit, RISK-063).

### 3g. Identity-scoped (patients and staff)
`customers` GET / POST and `reservations` GET / POST decide per caller: a patient may read and write **their own**
record (`isOwnIdentity()` in `src/lib/customerIdentity.ts`: `customers.auth_user_id`, falling back to normalised phone / email
for older rows), staff go through the staff checks, and the one deliberately anonymous action is the deposit self-report
(RISK-018). Patients are supposed to reach these routes, so they must not use `requireStaffAccess`.

### 3h. Not on `dev` yet
The reception bot (`api/bot/*`, `src/lib/botAuth.ts`, `src/lib/botTools.ts`, the knowledge-base migration) is described in
`ARCHITECTURE.md` and `DB_SCHEMA.md` but its code is not committed to `dev` at the time of this audit. When it lands, its
routes authenticate with a shared secret (`requireBotSecret`), not a user token; add them to this table then.

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
- **Open "allow all" policies were closed (RISK-128, applied 2026-10-21).** A subset of tables (`roles`,
  `employee_accounts`, `hr_*`, `employee_notes`, `prescriptions`, `inventory_*`, `product_sales`,
  `device_maintenance_history`, `terms_and_conditions`, `admin_roles`) carried pre-2026-07-25 `USING (true)` policies under the
  blanket enable. The anon key is public (it ships in every page), so on 2026-10-21 thirteen of 64 tables were readable by
  anybody who opened the site, and the baseline also allowed INSERT / UPDATE / DELETE on `employee_accounts` and `roles`.
  `supabase/migrations/20261023000000_close_open_rls_policies.sql` removes them; the two read policies it left for
  `employee_accounts` and `hr_attendance` were dropped afterwards, once `UserProfileView` and `DoctorAccountView` read
  through `/api/profile*`. Both steps were run on the dev project and on production. **Measured with the browser key:
  0 of 64 tables readable on both** (`node scripts/check-anon-access.mjs`; 8 tables are empty, so the result proves nothing
  for them). **Not measured:** writes with the browser key.
- **Run the check on every new clinic project.** Each clinic is its own Supabase project (DEC-001), so a project built from an
  old baseline can have the open policies again. Run `node --env-file=.env.local scripts/check-anon-access.mjs` before handing
  a project over and after any migration that adds tables. It needs a real project, so it is not part of the test suite. When the
  project refuses to list its tables to the anon key (HTTP 401, the case on production) the script reads the table names from
  `supabase/migrations`, and then "Blocked" means "returned nothing".
- **Guard in the suite:** `tests/lib/migrationsRls.test.ts` reads the migrations and fails when a new one creates an open policy
  (`USING (true)` / `WITH CHECK (true)`, other than for `service_role`) or a table without `ENABLE ROW LEVEL SECURITY`.
- **Dead browser reads remain.** `AdminNewBookingView.tsx` and the `reservation_products` reads in `page.tsx` /
  `BookingDetailsModal.tsx` still call Supabase with the browser key. RLS blocks them, so they return nothing and are not a
  leak, but they should move to the API (listed in RISK-128 "Not covered").
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
  (§4), which is why an open policy was a leak (RISK-128) rather than a harmless leftover.
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
- **Public reads that were never decided on (found in the 2026-10-21 audit, not yet logged as a RISK):**
  `GET /api/provider-attendance?date=` returns each provider's check-in / check-out rows to anyone, and `GET /api/packages` and
  `GET /api/providers` return full rows including fields the public site does not render. None is PHI. Decide whether each is
  meant to be public; if not, gate it with `requireStaffAccess` and add a public-safe projection for the site.
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
2. Staff-only → call `requireStaffAccess` (or `requireAdministratorAccess`, `requireFinanceAccess`, `verifyHrAccess` when the
   data needs it) at the top of every handler, not just `GET`. A route that gates `POST` but not `DELETE` is still an open route.
3. Patient-facing → do not reuse `requireStaffAccess`. Scope by identity
   (`isOwnIdentity` pattern in `src/lib/customerIdentity.ts`), and double-check financial/sensitive
   fields aren't patient-writable regardless of what the request body contains (RISK-018's
   `/api/customers` fix is the template).
4. If it touches money, inventory counts, or PHI (medical records, prescriptions) and isn't
   staff-gated yet, that's a bug — file it in `RISKS.md`, don't leave it implicit.
5. Never read a table from the browser with the anon key (RLS is closed, RISK-128); add an API route. After a new table, run
   `node scripts/check-anon-access.mjs`.
6. New table → new migration must include
   `ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;` with no policy (§4). Update `DB_SCHEMA.md`
   in the same change per `CLAUDE.md` rule 6.
7. Adding it to `PROTECTED_API_PREFIXES` in `middleware.ts` proves authentication only — it is
   never sufficient on its own for a route that needs role-based authorization (§2).
