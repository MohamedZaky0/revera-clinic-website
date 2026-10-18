# Profile, Account Footer And Change Password: Manual Test Checklist

> Reasoning: `ai_docs/DECISIONS.md` -> **DEC-109**. Automated coverage: `tests/components/UserProfileView.test.tsx` (password and payroll cases).

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-18 | Footer, Profile open, Logout confirm, mobile + Arabic geometry, card grid | dev (localhost) | Browser inspection as superadmin; Logout confirm cancelled (not executed) | Pass |
| | Real password change + sign in with the new password | | Needs the owner (no passwords typed by Claude) | Pending |

## Sidebar account footer
- [ ] Bottom of the sidebar shows avatar, name and role above a Logout row, separated from the nav by a divider; with Settings expanded the footer stays visible (does not scroll away).
- [ ] The header no longer has a Profile button; only branch selector, + and notifications remain.
- [ ] Clicking the account row opens Profile and the row shows as active; Settings is NOT highlighted.
- [ ] Logout asks "Log out?" first. Cancel stays logged in; Confirm logs out (and records check-out if checked in).
- [ ] Arabic: footer is on the right, avatar/icon on the right, label reads right-to-left. Mobile (375px): open the menu, the footer is inside the drawer and fully visible.
- [ ] Reception and doctor logins: same footer on /reception; doctor portal unchanged.

## Profile page
- [ ] Wide screen: Personal Information and Security side by side, Work Information full width, Attendance and Payroll side by side; below 1280px everything stacks in one column.
- [ ] The page switches to Arabic with the language toggle.
- [ ] A user with no salary/target stored sees a dash, not made-up amounts (DEC-108).

## Security / Change Password (must be done by a person)
- [ ] Weak password (e.g. `abcdefgh`) is rejected with the rule text before any request.
- [ ] Mismatched confirmation is rejected.
- [ ] A valid password shows "Password updated successfully!" ONLY after Supabase accepts it; log out and log in with the new password to prove it really changed.
- [ ] Re-using the current password shows Supabase's error, not a success message.
- [ ] Doctor portal Profile tab: the same card works there too (it previously did nothing).
- [ ] Check Supabase dashboard -> Authentication -> Email -> "Secure password change". If ON and the change is refused for needing a recent login, tell Claude.
