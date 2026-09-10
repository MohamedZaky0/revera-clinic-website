# Role Lock / Unlock Manual Test Checklist

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** run against the linked dev database first. You need **two** logged-in accounts to
> cover this properly — one `superadmin` and one `admin` — because the whole point of the change is
> that they see different controls.
>
> Reasoning and code pointers are in `ai_docs/DECISIONS.md` → **DEC-052**. This file is just the
> click-through checklist referenced from there.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### Migration landed correctly

- [ ] Run `supabase db push` (or confirm `20260910000000_add_locked_to_roles.sql` is applied) and
      query `select name, locked from public.roles order by name;`.
- [ ] Confirm every pre-existing `superadmin`, `admin`, `doctor`, `receptionist` and `reception` row
      came back with `locked = true` — the behaviour the old hardcoded list used to give.
- [ ] Confirm every other role (on Revera prod that is `saif`, `test`, `ss`) came back with
      `locked = false`, i.e. still deletable exactly as before.
- [ ] Confirm the column is `NOT NULL DEFAULT false`: insert a new role through the UI and check its
      `locked` is `false`, not `null`.

### Superadmin sees and can use the toggle

Log in as a **superadmin**, go to Admin → Settings → Role Management.

- [ ] Every role row except `superadmin` and `admin` shows a padlock button next to the Actions
      column. An unlocked role shows the open padlock; a locked one shows the closed padlock.
- [ ] `superadmin` and `admin` show **no** padlock button and still read "System Locked".
- [ ] Click the open padlock on an unlocked custom role (e.g. `test`). Confirm the confirmation
      prompt names the role and warns that permissions can no longer be edited.
- [ ] Accept. Confirm the row now shows "System Locked", the delete icon is gone, the padlock is
      closed, and `select locked from public.roles where name='test'` returns `true`.
- [ ] Click the closed padlock on that same role and accept the unlock prompt. Confirm the delete
      icon comes back and the column returns to `false`.

### Admin cannot lock or unlock

Log in as an **admin** (not superadmin).

- [ ] Role Management shows **no** padlock button on any row — locked or unlocked.
- [ ] Locked roles still read "System Locked"; unlocked roles still show their delete icon.
- [ ] Call the endpoint directly with the admin's token and confirm it is refused with **403**:
      `PATCH /api/roles` body `{"name":"test","locked":true}`.

### A locked role really is frozen

With a custom role locked (from the superadmin steps above):

- [ ] As an **admin**, try to edit that role's permissions in the UI and save. Confirm it fails with
      a message saying a superadmin must unlock it first — and confirm the permissions in the
      database did **not** change. (This is the half that was unprotected before: the old lock only
      blocked deletion.)
- [ ] As an **admin**, confirm the delete icon is not offered for that role.
- [ ] Call `DELETE /api/roles?name=<locked role>` directly with an admin token. Confirm **400** and
      that the row still exists.

### The lockout guard holds

- [ ] As a **superadmin**, call `PATCH /api/roles` with `{"name":"superadmin","locked":false}`.
      Confirm **400** and a message that it is a core system role. Confirm the row is still locked.
- [ ] Repeat with `{"name":"admin","locked":false}` — same result.
- [ ] Call `DELETE /api/roles?name=superadmin` as a superadmin. Confirm **400** and the role
      survives. Repeat for `admin`.

### Regression — nothing else moved

- [ ] Create a brand-new role with a few permissions. Confirm it saves, appears unlocked, and can be
      edited and deleted exactly as before this change.
- [ ] Assign an employee to a locked role and confirm the assignment still works — locking a role
      restricts editing the role itself, not using it.
- [ ] Confirm the Arabic UI shows translated lock/unlock tooltips and confirmation prompts, not raw
      keys, and that the padlock sits correctly in RTL.
