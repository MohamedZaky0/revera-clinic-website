# Services: System-Only (Show On Website) Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> **DEC-111**. Automated coverage: `tests/routes/services.test.ts` (show_on_website cases), `tests/lib/isShownOnWebsite.test.ts`.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | Everything below | | Not run yet (needs the migration applied and a staff login) | Pending |

## Before testing
- [ ] Migration `20261019000000_add_show_on_website_to_services.sql` applied to the database being tested (dev first, production before deploying the code).

## Admin
- [ ] Services -> edit any service: a "Show on website" switch is present, ON by default for existing services.
- [ ] Turn it OFF, Save: the row shows an amber "Not on website" badge (desktop table and mobile card). Reload the page: still OFF and still in the list (it must NOT disappear).
- [ ] Add a new service with the switch OFF: it is created, listed with the badge, and appears nowhere on the website.
- [ ] Turn it back ON: the badge goes away and the service appears on the website again.
- [ ] A different staff member (or an older open admin tab) saves some other change to the list: the hidden service stays hidden.

## System-only service stays fully usable inside
- [ ] Reception: New Booking can pick the hidden service (e.g. an RRS service) and create the booking.
- [ ] Doctor session: the hidden service is selectable as an additional service.
- [ ] A package can include it, and Add Previous Booking can use it.
- [ ] Its existing bookings still block their time slots on the website calendar (a hidden service's duration is still known).

## Website (log out or use a private window)
- [ ] Home page services section and /services page do not list the hidden service; other services are unchanged.
- [ ] Online booking: the category/service picker does not offer it. Open the booking with `?service=<id of the hidden service>`: it opens with nothing preselected.
- [ ] The WhatsApp bot still lists the hidden service (intended).

## Known limits (see DEC-111)
- [ ] `GET /api/services` still returns hidden services to anyone; decide whether server-side filtering is needed.
