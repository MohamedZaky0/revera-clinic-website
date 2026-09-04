---
trigger: glob
globs: src/app/api/**/*.ts
---

# API route rules — authorization

## The helpers (do not invent new ones)

`src/lib/access.ts`:

| Helper | Guarantees |
|---|---|
| `requireAuthenticatedUser(req)` | a valid Supabase session — **patient or staff** |
| `requireStaffAccess(req)` | caller has an `employee_accounts` row |
| `requireAdministratorAccess(req)` | role is `superadmin` or `admin` |

`src/lib/auth.ts` → `verifyHrAccess(req)` guards the HR routes (`superadmin`/`admin`/`hr`).

Standard pattern:

```ts
const access = await requireStaffAccess(req);
if ('error' in access) {
  return NextResponse.json({ error: access.error }, { status: access.status });
}
```

## Choosing the right one

**Patient OTP login is real Supabase Auth.** A logged-in patient therefore satisfies
`requireAuthenticatedUser`. For anything touching another person's data — medical records,
prescriptions, other patients' bookings — `requireAuthenticatedUser` is **not sufficient**. Use
`requireStaffAccess`.

## Guard per method, never per file

A route file's methods have different audiences. Guarding a whole file breaks the public site.

- The public marketing site and booking page read these **unauthenticated**, and their `GET` must
  stay open: `branches`, `providers`, `terms`, `page-settings`, `services`, `categories` (as
  consumed by `BookingModal.tsx`, `ContactPageContent.tsx`, `TermsModal.tsx`).
- `POST /api/reservations` is intentionally public — that is how a website visitor books.
- **But that does not make the rest of the route public.** `GET /api/reservations` had no check at
  all and returned every patient's name, phone, email and notes to anyone who asked. It was missed
  in an earlier audit precisely because "the POST is public" was read as "the route is public."

**When touching any route file, check every exported method separately.**

## Routes serving both patients and staff

Use the established classification — do not re-implement it:

```ts
import { classifyCaller } from '@/app/api/customers/route';
import { isOwnIdentity } from '@/lib/customerIdentity';
```

`classifyCaller` returns `staff` / `patient` / `unauthenticated`. For a `patient` caller you must
then verify the requested record actually belongs to them via `isOwnIdentity()` — **never trust an
identifier from the query string or body.**

- **What happened:** the patient profile page fetched `/api/reservations?phone=<their own number>`,
  and the server filtered on that param without checking the caller's session. Substituting anyone
  else's number returned that person's full booking history.

A `patient` caller must never be able to run an unfiltered query. Return 403 if no ownership filter
is supplied; return `[]` (not another person's data) if the filter doesn't match them.

## Never silently swallow a write failure

- **What happened:** `POST /api/branches` returned the echoed request payload with an implicit 200
  after both its update and its upsert failed. It looked like a successful save for weeks.
- **What happened:** a PATCH returned `status: 'checked_in'` after the DB rejected that value and
  stored `confirmed`.

If a write fails, return a real error status and the underlying message. If a fallback write
succeeds with *different* data than requested, the response must say so — never report the
requested state as if it were stored.

Do not add retry-with-fewer-fields fallbacks. That pattern hid schema drift here for weeks and the
inline comment at the reservations insert explicitly forbids reintroducing it.

## Adding an auth guard to an existing route

Adding a guard breaks every caller that wasn't sending a token. After guarding, grep for all callers
and confirm each sends `Authorization`. Existing mechanisms — use one, don't invent a third:
- `authenticatedJsonHeaders` (in `src/app/admin/page.tsx`)
- `getAuthHeaders()` (`src/components/admin/doctor/utils.ts`)

List every call site you checked in your report.
