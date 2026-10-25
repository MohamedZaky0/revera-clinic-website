# Session Ended: Diagnostic Trail On The Login Page: Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> DEC-124; related: `ai_docs/RISKS.md` -> RISK-130. Automated coverage: `tests/lib/authRecovery.test.ts` (section "auth trail and logout detail").

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | Force a lost session in an open admin tab, land on /login, read the trail | dev.reveraclinics.com | | Not run yet |
| 2026-10-24 | Reception laptop: logout reproduced, screenshot of the login page | production | trail: 11 TOKEN_REFRESHED in 3 s, then 429, then SIGNED_OUT; clock was 1 h ahead in UTC | Cause found; clock synced, awaiting a day of normal use |
| | Clock warning banner on a computer with a wrong clock (DEC-125) | dev | | Not run yet |

## Checks
- [ ] Sign in on dev, open /admin. In DevTools -> Application -> Local Storage delete the Supabase `sb-...-auth-token` key (this is what a lost session looks like). The page goes to /login and the amber notice reads "Your session ended unexpectedly", with small grey lines under it (for example `SIGNED_OUT session=no visible`).
- [ ] The lines have a time, a three-letter tab tag, the event name, and `visible`/`hidden`; no token, e-mail or name appears anywhere in them.
- [ ] Reload /login: the notice and the lines are gone (shown once).
- [ ] Press the real Logout button: /login shows no notice and no lines.
- [ ] Wait an hour idle (or shorten the timer on dev): the notice says "signed out after an hour" and shows no lines.
- [ ] Open the admin in two tabs, press Logout in one: the other follows with no "unexpected" notice (unchanged behaviour, RISK-114).
- [ ] Normal use for ten minutes (switch tabs, open Add Previous Booking, pick dates): nothing in the screen changes; no new console errors.

## Clock warning and refresh burst (DEC-125)
- [ ] On a computer with a correct clock: no amber banner at the top of the admin, in English or Arabic.
- [ ] On a test computer (or a VM) with the clock set 1 hour ahead by hand: after signing in, the banner appears at the top saying "about 1 hour ahead of the real time" with the Windows steps; the Arabic version reads right to left.
- [ ] After "Set time automatically" + "Sync now" and a page reload, the banner is gone.
- [ ] With the clock still wrong, work in Add Previous Booking for five minutes, opening and closing it and choosing dates: the browser DevTools Network tab shows the `token?grant_type=refresh_token` calls at about one every 30 seconds, not several per second, and you are not sent to /login.
- [ ] Sign out, sign in as a different account in the same tab: every screen shows the second account's data (no leftover of the first).
- [ ] The role check still happens: deactivate a throwaway account, and within an hour its next refresh sends it to /login with the inactive notice (DEC-117 unchanged).
