# RISK-113 — Auth Session Not Forced Out On A Transient Verification Failure — Manual Test Checklist

> **Living document.** Update this file with dated dev/production evidence as each check is run.
> Full reasoning: `ai_docs/RISKS.md` → **RISK-113**. Related prior fix in the same function:
> `ai_docs/DECISIONS.md` → **DEC-102** (fixed a different cause of the same symptom — forced logout
> on token refresh — four days earlier; this closes the remaining gap in the same route).
> Automated coverage: `tests/routes/auth-me-resilience.test.ts`.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Background (plain language, for whoever reports the next "it logged me out")

`GET /api/auth/me` runs every time the browser checks who is logged in — on page load, and again
automatically roughly every hour when the browser refreshes its login token in the background,
even while staff are actively using the system. Before this fix, if that one check to Supabase's
own servers failed for any reason — including a brief internet hiccup, not because the login was
actually invalid — the system treated it exactly like an expired login and logged the person out.
After the fix, only a real "this login is not valid" answer logs someone out; a momentary failure
to check is treated as "try again shortly" and the person stays logged in.

## Per-check list

### The real scenario this closes
- [ ] Ask whoever reported "the system logs me out on its own" (the clinic laptop) which browser/
      machine it happens on, and roughly how long they'd been actively working when it happened.
- [ ] Confirm that machine is on a connection that occasionally drops for a second or two (café-grade
      Wi-Fi, a shared router, a VPN/firewall/antivirus that occasionally blocks a request) — this is
      the condition that triggers the bug; a perfectly stable connection may rarely reproduce it.

### Confirming the fix on dev (safe, does not touch production data)
- [ ] Log in to `/admin` (or `/reception`, `/doctor`) on dev as a real staff account and confirm the
      session stays logged in normally during ordinary use.
- [ ] With browser dev tools open, go to the Network tab, find a request to `/api/auth/me`, and
      confirm it still returns `200` under normal conditions.
- [ ] Simulate a flaky connection: in dev tools, throttle the network to "Offline" for 2–3 seconds
      at the exact moment the app is mid-request to `/api/auth/me` (easiest: open dev tools' Network
      conditions, toggle Offline right as you trigger a manual page reload), then restore the
      connection. Confirm the user is **not** redirected to `/login` and the session is still active
      after the connection returns — the old behaviour was an immediate forced logout here.
- [ ] Leave a dev session open and logged in for over an hour of real, continuous use (or force a
      token refresh sooner via Supabase's session settings) while occasionally toggling the network
      off for a couple of seconds around the refresh. Confirm no unexpected logout occurs.

### Regression — must still log a user out when the login is genuinely invalid
- [ ] Log in, then from Supabase's dashboard (Authentication → Users) revoke/sign out that user's
      session server-side, or simply wait for a token to genuinely expire with the network fully
      connected. Confirm the system still correctly logs the user out and returns them to `/login` —
      this fix must not mask a real, confirmed invalid session.
- [ ] Try `/admin` with no login at all → still redirected to `/login` as before.

### Production confirmation
- [ ] After this ships to production, ask the clinic to report back after a normal working day on
      that specific laptop whether the unexpected logout still happens. Record the outcome here with
      a date, even if "no further reports after N days" is all the evidence available.
