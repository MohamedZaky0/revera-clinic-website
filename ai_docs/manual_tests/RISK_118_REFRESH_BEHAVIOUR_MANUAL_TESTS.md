# RISK-118 — Reload Keeps The Section; Window Switches No Longer Reload Tables — Manual Test Checklist

> **Living document.** Update with dated evidence as each check is run.
> Full reasoning: `ai_docs/RISKS.md` -> **RISK-118**. Automated coverage: `tests/lib/adminSection.test.ts` (URL helper only).
> Everything below needs a real logged-in browser; none of it has been run yet.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

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
