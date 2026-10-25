# RISK-137 — Public Read Caching And Lazy Booking Data — Manual Test Checklist

> **Living document.** Update with dated evidence as each check is run.
> Full reasoning: `ai_docs/RISKS.md` -> **RISK-137**, `ai_docs/DECISIONS.md` -> **DEC-131**. Automated coverage: `tests/routes/public-read-caching.test.ts`, `tests/components/BookingModalLazyLoad.test.tsx`, `tests/components/publicPageSettings.test.tsx`.
> Use test data only. "Network" means the browser dev tools Network tab (tick "Disable cache" OFF). CDN headers only appear on a deployed Vercel preview, not on `next dev`.
> **Note for editors:** after a CMS edit (service, price, category, branch, package, terms, page settings) visitors can need up to 60 seconds to see it, and a little longer if the CDN answers one more request with the old copy while it refreshes. Staff screens that send a login token always see fresh data.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-25 | Route, component and shared-settings tests | local, `perf/cache-public-reads`, Vitest | all pass | Pass |
| | Headers on a Vercel preview (below) | | | Pending |
| | Request counts in a real browser (below) | | | Pending |
| | Staff-login freshness check (below) | | | Pending |

## Request counts (Network tab, filter `/api/`, hard reload)
- [ ] Open `/about` (or `/contact`): one `GET /api/page-settings` and no categories, services, branches, providers or terms requests.
- [ ] Open `/login` and `/admin` (signed out): no `/api/providers`, `/api/branches`, `/api/terms`, `/api/categories` or `/api/services` requests from the booking popup. (The admin page makes its own requests after sign-in; that is expected.)
- [ ] Open `/` (home): `page-settings` appears **once**, plus categories, services, packages. No branches, providers or terms.
- [ ] Switch to another browser tab and back, five times in a row: no new `page-settings` request. Leave the tab hidden for more than 5 minutes and come back: exactly one new request.

## Quick Book popup
- [ ] On `/`, click "Make Appointment" / the booking button: the popup opens and the six reads fire once (categories, services, branches, providers, page-settings reused or one request, terms). Services and branches list correctly after a moment.
- [ ] Close and reopen the popup: no new requests.
- [ ] Click a service's "Book" button on the home or services page (a button that passes a service): the popup opens with that service preselected, its category selected, and the session type matching (an online-only service switches to online).
- [ ] A first-ever click on a `?service=` deep link on the popup does not leave the popup empty or reset the service.
- [ ] Booking flow end to end (pick service, date, time, details, confirm): behaves exactly as before, deposit percentage and payment details (InstaPay / wallet) are the ones in Page Settings.

## /book page
- [ ] Open `/book`: the booking flow loads at once (the six reads fire on load, since the page renders the flow inline). Services, branches and doctors appear.
- [ ] Open `/book?service=<id>` for a visible service: the service is preselected after load. For a service hidden from the website: nothing preselected.

## Response headers (Vercel preview, DevTools > Network > a request > Response headers)
- [ ] Anonymous `GET /api/services`, `/api/categories`, `/api/branches`, `/api/packages`, `/api/terms?active_only=true`, `/api/page-settings`: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` and `Vary: Authorization`. A second request inside a minute shows `x-vercel-cache: HIT`.
- [ ] Same URLs with `curl -H "Authorization: Bearer junk"`: `Cache-Control: private, no-store`, never `public`.
- [ ] `GET /api/providers` and `GET /api/availability?...`: no `public` / `s-maxage` header.
- [ ] A failing response (for example switch the database off on a preview, or request `/api/terms` while the table errors) has no public cache header.

## Staff-login freshness (must show fresh data)
- [ ] Sign in to `/admin` as a staff user. Edit a service price (or a package, a branch name) and save. Reopen the list inside the admin: the new value shows immediately.
- [ ] Change a Page Settings value (for example the header "customer login" toggle or the deposit percentage) and save. In the same browser, the admin screen reads the full blob (with Department data) and shows the new value at once. In `curl` with the staff token, `Cache-Control` is `private, no-store`.
- [ ] Copy the staff token and call `GET /api/page-settings` with it on a preview twice: both are `private, no-store`, and the body still contains `departments` and `notifications.staffEmail`. The same call without the token has neither field.

## Visitors after a CMS edit (the 60-second note)
- [ ] Edit a service price as staff. In a private window (signed out), load `/services`: the old price may still show for up to about a minute. Reload after 60 seconds: the new price shows. If the old price still shows after 6 minutes, report it.
- [ ] In the browser that made the Page Settings save, the public navbar/hero shows the change on the next load without waiting (the save fires the settings-change event). In another browser, it appears within 5 minutes at the latest.

## Does not break
- [ ] Admin New Booking screen: package list and service list load.
- [ ] Terms page `/terms` and the Terms popup in the booking flow show the active terms.
- [ ] Doctors admin table still shows each doctor's booking count; the public booking popup still lists doctors.
