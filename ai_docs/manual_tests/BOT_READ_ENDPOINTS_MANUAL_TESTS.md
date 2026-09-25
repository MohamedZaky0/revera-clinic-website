# Bot Read Endpoints Manual Test Checklist — `/api/bot/*`

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database, with `BOT_API_SECRET` set in the environment.
> These endpoints are called server-to-server by the n8n assistant workflow, never by a browser.
> They are read-only and return no patient, booking, payment or staff-pay data.
>
> Automated coverage lives in `tests/routes/bot-tools.test.ts` (20 tests). The checks below are the
> ones that need a real database and real clinic data, because their whole purpose is catching a
> mismatch between what the endpoint says and what the admin panel shows.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### The secret guard

- [ ] `curl` each of the three endpoints with **no** `x-bot-secret` header. Confirm 401 and no data in the body.
- [ ] Repeat with a wrong secret. Confirm 401.
- [ ] Unset `BOT_API_SECRET` in the environment, restart, and call an endpoint. Confirm **503**, not 200 — a missing env var must not publish clinic data.
- [ ] Restore the secret and confirm all three endpoints return 200.

### Branches match the admin panel

- [ ] `GET /api/bot/branches`. Confirm the list matches Settings → Branches: same branches, same phone numbers, same addresses.
- [ ] Confirm a branch set to **Inactive** in the admin panel does not appear.
- [ ] Compare `weekly_hours` against Settings → Service Hours for one branch, day by day.
- [ ] Find (or temporarily create) a branch with **no** service hours saved. Confirm `weekly_hours_configured` is `false` and `weekly_hours` is empty — the endpoint must not report the 09:00–20:00 fallback as if it were configured.

### Services and prices match what checkout would charge

- [ ] `GET /api/bot/services?branchId=<branch>`. For three services, compare `price_egp` with the price the admin Services screen shows for that branch.
- [ ] Pick a service with an **active promotion**. Confirm `base_price_egp` is the pre-discount price, `price_egp` is the discounted one, and `promotion_text` matches the badge in the admin panel.
- [ ] Open a booking for that same service in the admin panel and start the Payment Settlement modal. Confirm the price it charges equals `price_egp` from the endpoint. **If these two ever differ, stop and report it** — the assistant would be quoting a price the clinic does not charge.
- [ ] Change a service price in the admin panel, then call the endpoint again. Confirm the new price appears (allow for any cache you configured in n8n).
- [ ] Set a service to **not visible** (or inactive) and confirm it disappears from the response.
- [ ] Call with `?categoryKey=` for each category and confirm only that category's services come back.
- [ ] Call with an unknown `branchId`. Confirm **400**, not a price computed against no branch.
- [ ] Find a service whose `duration_minutes` is empty in the database. Confirm the endpoint returns `duration_minutes: null` rather than 30.

### Doctors expose nothing sensitive

- [ ] `GET /api/bot/doctors` and search the raw response for a doctor's phone number, national ID, salary and commission values taken from the Doctors screen. Confirm **none** of them appear anywhere in the body.
- [ ] Confirm a doctor set to **Inactive** does not appear.
- [ ] `?branchId=<branch>` — confirm the list matches the doctors assigned to that branch in the admin panel.
- [ ] `?serviceId=<id>` — confirm only doctors who provide that service are returned. (The `providers.services` column stores English service names; a doctor whose services list was edited to a renamed service will silently drop out — worth checking one.)
- [ ] Take a doctor with a **split shift** (two windows on one day) and compare the `schedule` rows for that day with the Doctors screen.
- [ ] Take a doctor with a day marked closed. Confirm `is_open: false` for that day.
- [ ] Take a doctor whose schedule has **no entry** for some weekday. Confirm that day comes back as `"branch opening hours"`, not as a day off — this mirrors how `/api/availability` treats a missing day, and the assistant must not contradict the slots the booking screen offers.
- [ ] Call with an unknown `serviceId`. Confirm 400.

### Availability matches the booking screen

- [ ] `GET /api/bot/availability?serviceIds=<id>&branchId=<branch>&date=<today+2>`. Open the admin New Booking screen with the same service, branch and date and compare the offered times — they must match.
- [ ] Repeat for a multi-service selection (`serviceIds=5,8`). Confirm the times reflect the combined duration, not one service.
- [ ] Call with a past date, a date more than 90 days ahead, a malformed date, an unknown service id, and `sessionType=telepathy`. Confirm 400 each time.
- [ ] Pick a day with many free slots. Confirm at most 20 times are returned, `available_count` is the real number and `truncated` is `true`.
- [ ] Check a patient in (status `checked_in`) for a slot, then re-run availability for that slot. Known app limitation: the slot may still show as free. Record what you see here — it is the evidence for the separate availability-status fix.

### Packages, products, settings, terms

- [ ] `GET /api/bot/packages` — compare with Marketing → Packages: names, prices, validity days, and the included services with their session counts.
- [ ] Confirm an inactive package does not appear, and that a package with no branch shows `available_at: "all branches"` and still appears when filtering by a branch.
- [ ] `GET /api/bot/products` — confirm the list matches the retail products in Inventory, that no `cost_price` or exact stock number appears anywhere in the body, and that a consumable-only product is absent.
- [ ] Set a product's stock to 0 and confirm `in_stock` becomes `false` (the product still appears).
- [ ] `GET /api/bot/settings` — compare `deposit_percentage` with Settings → Deposit Settings. Then set a *different* percentage in Booking Settings and confirm the endpoint still reports the Deposit Settings value, which is what the public booking form charges.
- [ ] Toggle Global Ending Session and confirm `global_ending_session` flips.
- [ ] Clear the cancellation window and confirm `cancellation_window_hours` is `null`, not 4.
- [ ] `GET /api/bot/terms` — compare with Settings → Terms & Conditions, and confirm an inactive item is absent.

### End to end through the assistant

- [ ] With the three tools wired into n8n, ask the bot in Arabic for a service price without naming a branch. Confirm it asks which branch instead of guessing.
- [ ] Ask for the same price naming a branch. Confirm the number matches the endpoint response exactly, and that the reply names the branch.
- [ ] Ask about a doctor's working days. Confirm the answer matches the `schedule` rows and does not include a phone number.
- [ ] Ask for something the endpoints do not cover (for example free slots on a date, before that tool exists). Confirm the bot says it cannot answer rather than inventing.
