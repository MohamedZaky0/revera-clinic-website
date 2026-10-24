# Session Ended: Diagnostic Trail On The Login Page: Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> DEC-124; related: `ai_docs/RISKS.md` -> RISK-130. Automated coverage: `tests/lib/authRecovery.test.ts` (section "auth trail and logout detail").

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | Force a lost session in an open admin tab, land on /login, read the trail | dev.reveraclinics.com | | Not run yet |
| | Reception laptop: reproduce the logout, screenshot the login page | production | | Waiting for the next occurrence |

## Checks
- [ ] Sign in on dev, open /admin. In DevTools -> Application -> Local Storage delete the Supabase `sb-...-auth-token` key (this is what a lost session looks like). The page goes to /login and the amber notice reads "Your session ended unexpectedly", with small grey lines under it (for example `SIGNED_OUT session=no visible`).
- [ ] The lines have a time, a three-letter tab tag, the event name, and `visible`/`hidden`; no token, e-mail or name appears anywhere in them.
- [ ] Reload /login: the notice and the lines are gone (shown once).
- [ ] Press the real Logout button: /login shows no notice and no lines.
- [ ] Wait an hour idle (or shorten the timer on dev): the notice says "signed out after an hour" and shows no lines.
- [ ] Open the admin in two tabs, press Logout in one: the other follows with no "unexpected" notice (unchanged behaviour, RISK-114).
- [ ] Normal use for ten minutes (switch tabs, open Add Previous Booking, pick dates): nothing in the screen changes; no new console errors.
