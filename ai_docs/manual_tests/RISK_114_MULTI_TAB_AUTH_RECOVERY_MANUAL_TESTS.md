# RISK-114 — Silent Recovery From An Involuntary Sign-Out (Refresh-Token Rotation) — Manual Test Checklist

> **Living document.** Update this file with dated dev/production evidence as each check is run.
> Full reasoning: `ai_docs/RISKS.md` → **RISK-114**. Related prior fix in the same auth flow:
> `ai_docs/RISKS.md` → **RISK-113** (fixed a different cause of the same symptom — forced logout on
> a transient `/api/auth/me` failure — two days earlier; this closes a separate, action-tied cause
> the clinic reported afterward).
> Automated coverage: `tests/lib/authRecovery.test.ts`.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Background (plain language, for whoever reports the next "it logged me out")

Supabase's own login library can decide, entirely on its own, that a session is dead and sign the
person out — with no "Logout" button pressed and nothing wrong with their actual login. The usual
trigger: the same staff login is open in more than one browser tab or window at once (for example a
patient-file tab and a separate bookings tab). Each tab tries to silently renew its login in the
background using the same saved token, but that renewal token can only be used once — whichever tab
renews second gets rejected, and Supabase's library reacts by tearing down the session in that tab.
Before this fix, the app treated that exactly like someone clicking "Logout" and sent them to the
login screen. After the fix, the app first tries once, silently, to recover the session using the
last login it had — if that works, the person never sees a login screen at all; only if it fails too
does the app fall back to showing the login screen, same as before.

## Per-check list

### The real scenario this closes
- [ ] Ask the clinic whether the laptop that keeps getting logged out commonly has more than one
      browser tab or window of `/admin` (or `/reception`/`/doctor`) open at the same time, logged in
      as the same staff account — this is the condition most likely to trigger the bug.
- [ ] Confirm roughly how soon after opening a second tab, editing a patient file, or creating a new
      booking the logout tends to happen (the report so far: as little as ~5 minutes).

### Confirming the fix on dev (safe, does not touch production data)
- [ ] Log in to `/admin` on dev as a real staff account in one tab, then open a **second tab** to the
      same URL (same browser, same login/session) — confirm both tabs show the admin panel normally.
- [ ] In one of the two tabs, edit a patient file or create a new booking. Watch both tabs for several
      minutes of normal use. Confirm neither tab is suddenly redirected to the login screen.
- [ ] Open the browser's console in both tabs before testing. If a `SIGNED_OUT` auth event fires in
      one tab (visible via a quick `supabase.auth.onAuthStateChange` log, or just by watching for any
      brief flash/re-render), confirm the tab **silently recovers** — i.e. it keeps showing the admin
      panel with no visible interruption — rather than dropping to `/login`.
- [ ] Only if the silent recovery itself fails (confirm by temporarily breaking the captured refresh
      token, e.g. via a quick debugger breakpoint, to force `recoverFromInvoluntarySignOut` down its
      failure path) should the tab fall back to the login screen — confirm that fallback still works
      correctly and isn't stuck in a broken state.

### Regression — must still log a user out when they actually mean to
- [ ] Click the explicit "Logout" button → still immediately redirected to `/login`, no silent
      recovery attempted (this is `explicitSignOutRef`-gated and must not be bypassed).
- [ ] Trigger the 1-hour idle-timeout logout (or temporarily shorten it for testing) → still logged
      out and redirected to `/login` as before.
- [ ] Log in with an account whose role doesn't match the portal (role-mismatch guard) → still signed
      out and redirected as before.
- [ ] Have `/api/auth/me` genuinely return 401/403 (a truly invalid session, not a transient one) →
      still signed out and redirected as before, not silently recovered.

### Production confirmation
- [ ] After this ships to production, ask the clinic to specifically try keeping two tabs/windows of
      the admin panel open at once on the laptop that was affected, for a normal working day, and
      report back whether the unexpected logout still happens. Record the outcome here with a date.
