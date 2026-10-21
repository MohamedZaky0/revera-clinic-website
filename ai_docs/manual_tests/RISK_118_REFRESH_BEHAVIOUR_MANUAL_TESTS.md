# RISK-118 — Reload Keeps The Section; Window Switches No Longer Reload Tables — Manual Test Checklist

> **Living document.** Update with dated evidence as each check is run.
> Full reasoning: `ai_docs/RISKS.md` -> **RISK-118**. Automated coverage: `tests/lib/adminSection.test.ts` (URL helper only).
> Everything below needs a real logged-in browser; none of it has been run yet.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-20 | Section survives reload | local dev, superadmin | Bookings, Finance and Settings -> Branches each reload onto the same page (URL `?section=...`); clicking Dashboard removes the param | Pass |
| 2026-10-20 | Invalid / action-only section values | same | `?section=Nonsense` and `?section=Logout` open Dashboard, the param is dropped, still logged in | Pass |
| 2026-10-20 | Password-setup link | same | `?setup=true&section=Patients`: the setup modal shows and the section opens; changing section keeps `setup=true` in the URL | Pass |
| 2026-10-20 | Window switches do not reload tables | same | 3 simulated returns to the tab (`visibilitychange`) on Patients, Inventory and HR: one `/api/auth/me` on the first, no customers / inventory / HR refetch, 0 spinner appearances. A dispatched event, not a real tab switch | Pass (weak) |
| 2026-10-20 | Failed background refresh keeps the table (Bookings) | same | Server stopped for 45 s: Pending list kept both rows and the badge | Pass |
| 2026-10-20 | NOT tested | | `/reception` and `/doctor` accounts reloading in place, a role without Finance access opening `?section=Finance`, token rotation after ~1 h, idle logout, wrong-portal login, Patients offline-save | Pending |

## Section survives a reload
- [ ] Log in at `/admin`, open Patients. The address bar now ends with `?section=Patients`. Press F5: you land on Patients, not Dashboard.
- [ ] Repeat for Bookings, Finance, and a Settings item (e.g. Branches). Each reloads onto the same page.
- [ ] Click Dashboard: the `?section=` part disappears from the address bar.
- [ ] Open `/admin?section=Patients` in a fresh tab while logged in: opens on Patients.
- [ ] Open `/admin?section=Nonsense` and `/admin?section=Logout`: opens on Dashboard, no error.
- [ ] Log in as a reception or doctor account (`/reception`, `/doctor`), open a section, press F5: stays there, path stays `/reception` or `/doctor`.
- [ ] As a role without Finance access, open `/admin?section=Finance` (paste it): you are moved to your first allowed section, not shown a blank page.
- [ ] Open `/admin?setup=true` (password-setup link): the setup modal still appears, and changing section keeps `setup=true` in the URL.

## Window switches do not reload tables
- [ ] Open Patients with the list loaded. Open dev tools -> Network, filter `customers`. Switch to another browser tab for 10 s and come back: no new `/api/customers` request and no "Loading..." flash.
- [ ] Same on Inventory (`/api/inventory/products`) and HR.
- [ ] On first load of a section with no data yet, the loading state still shows (it should not be hidden entirely).
- [ ] After roughly an hour of use, when the login token rotates, the tables refresh without a spinner and without emptying.

## A failed background refresh keeps the table
- [ ] On Bookings, in dev tools set the network to Offline for about 20 s (covers one 15 s poll), then back online: the booking list and Pending Approvals never go empty; they update again after reconnecting.
- [ ] On Patients, go Offline and trigger a refresh (e.g. save a patient): the list stays visible.
- [ ] Switching branch still shows the loading state and replaces the list with the new branch's data.

## Regressions to look for
- [ ] Logout button, idle logout and a wrong-portal login still sign out and redirect (RISK-113/114/117 paths).
- [ ] A newly approved or created booking still appears without a manual reload.
- [ ] Known and accepted change: a permission edited by an admin reaches an already-open tab after the next token rotation (about an hour) or a reload, no longer on every tab switch. Confirm a reload picks it up.
