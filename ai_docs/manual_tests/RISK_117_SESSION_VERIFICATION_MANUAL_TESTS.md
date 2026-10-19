# RISK-117: Session Verification And Logout Reasons: Manual Test Checklist

> Reasoning: `ai_docs/RISKS.md` -> **RISK-117**. Automated coverage: `tests/lib/authRecovery.test.ts`.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-19 | Login page shows the recorded reason | dev (localhost) | After the browser session lapsed, `/login` showed "Your session ended unexpectedly. Please sign in again." once | Pass |
| | Everything else below | | Needs a logged-in session; not run by Claude | Pending |

## Normal use must be unchanged
- [ ] Log in, work for a while (new booking, open an old booking): no extra screens, no new prompts.
- [ ] Logout button still asks for confirmation and, after confirming, lands on /login WITHOUT any amber notice.

## The two cases this closes (use browser dev tools)
- [ ] **Stale token:** while logged in, open Application -> Local Storage, edit the stored session's `access_token` to garbage (keep `refresh_token`), then reload. Expected: you stay logged in (the page refreshes the token and loads), no bounce to /login.
- [ ] **Server hiccup on load:** Network tab -> block `/api/auth/me` (right-click -> Block request URL), reload. Expected: the "Could not verify your session right now" panel with Try again, NOT the login page. Unblock it: the panel clears by itself within ~15 s or on Try again, and you are back in the app still signed in.
- [ ] **Really invalid login:** revoke the user's sessions in Supabase (Authentication -> Users) and reload. Expected: sent to /login with the amber notice about the server rejecting the session.

## Reasons on the login page
- [ ] After the 1-hour idle logout: notice says you were signed out after an hour without activity.
- [ ] Wrong portal (e.g. a doctor opening /admin): notice says the account belongs to a different portal.
- [ ] The notice appears once; refreshing /login does not show it again.

## On the clinic laptop
- [ ] Check the date, time and time zone are correct (a wrong clock makes tokens look valid after they have expired).
- [ ] After a week of use, ask the clinic whether any logout still happened and what the login-page notice said. Record it here with a date.

## Second pass (logout paths audit)
- [ ] Press Logout yourself, confirm: you land on /login with NO amber notice (this was the bug).
- [ ] Two tabs of the app open: Logout in tab A. Tab B goes to /login too, with NO notice and no flicker of the app coming back.
- [ ] Same account on two computers (or two browsers): Logout on computer 1. Computer 2 stays logged in and keeps working.
- [ ] Same two computers: leave computer 1 idle for an hour (or lower the idle limit while testing). It logs itself out; computer 2 stays logged in.
- [ ] Two tabs open, one of them idle in the background past an hour: after the background tab refreshes its token, both tabs keep working (no bounce).
- [ ] Open admin API pages (Employees, HR, Role Management) while Supabase is slow or rate limited: you may see a load error, but you stay logged in (the API answers 503, not 401).
- [ ] After a production deploy, tabs that were open during it reload once on next click; check you are still signed in afterwards.

