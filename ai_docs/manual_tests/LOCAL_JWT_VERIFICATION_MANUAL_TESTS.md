# Local Token Verification: Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> DEC-129; related: `ai_docs/RISKS.md` -> RISK-134. Automated coverage: `tests/lib/verifyToken.test.ts`, `tests/routes/local-jwt-verification.test.ts`, `tests/routes/middleware-auth.test.ts`.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-25 | Which signing key production uses | production dashboard (Project Settings > JWT Keys > JWT Signing Keys), read by the owner | Current key: ECC (P-256), created about 4 months ago. Previously used key: HS256 (shared secret), also about 4 months old, still listed | ES256 confirmed; do NOT revoke the old HS256 key (the legacy anon / service_role API keys are HS256 JWTs) |
| | Auth requests per hour before the change | production, Supabase Reports > Auth | About 68,878 requests, 2,799 errors in one hour (from the incident) | Baseline |
| | Auth requests per hour on the day after the deploy | production, Supabase Reports > Auth | | Not run yet |
| | Admin sign-in and navigation on dev | dev site | | Not run yet |
| | Deactivated employee refused on the next request | dev site | | Not run yet |

## Checks
- [ ] Baseline: note the Auth request count for the last hour in Supabase (Reports > Auth) before deploying to production.
- [ ] Sign in to `/admin` as superadmin on dev, open Bookings, Patients, Employees, Roles, HR > Payroll, Providers: every screen loads, no "Could not verify your session right now".
- [ ] Reload the admin page 5 times in a row: still signed in, no sign-out, no 401/503 in the browser Network tab for `/api/*` calls.
- [ ] In the browser Network tab, `/api/employees` and `/api/roles` answer 200 with a normal session.
- [ ] Deactivate a test staff member (Employees > Active off) while they are signed in on another browser: on their very next click or reload they are signed out with "This account is inactive" (not after an hour).
- [ ] Re-activate them: they can sign in again.
- [ ] Sign in as a receptionist (not admin): Employees / Roles / HR calls are refused with 403, the receptionist screens still work.
- [ ] Add a doctor and edit a doctor as superadmin: the change is saved and the Schedule Audit Log shows your e-mail as the person who changed it.
- [ ] Sign in as a patient (website): the patient profile still opens (this path still asks the Auth server once per request, by design).
- [ ] Call a protected endpoint with no token, with `Bearer garbage`, and with an old expired token: each answers 401 (`curl -s -o /dev/null -w "%{http_code}" https://<site>/api/employees -H "Authorization: Bearer garbage"`).
- [ ] After the production deploy and one working day: Supabase Reports > Auth shows a clear drop from about 68,000 requests an hour (staff traffic no longer calls `/auth/v1/user`; expect only logins, token refreshes and patient requests). If it did not drop, check the Vercel logs for staff tokens that fall back to `getUser` (an HS256 token) and report it.
- [ ] Optional, read only: decode just the header of a current admin access token on your own computer (the first dot-separated part, base64url) and confirm it says `"alg":"ES256"` and has a `kid`. Do not paste the token anywhere.
- [ ] Do not revoke the old HS256 signing key in the dashboard as part of this change.
