# Employees — Multi-Branch Assignment Manual Test Checklist

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database **after** `supabase/migrations/20261018000000_add_branch_ids_to_employee_accounts.sql`
> has been applied (verify: `select column_name from information_schema.columns where table_name = 'employee_accounts' and column_name = 'branch_ids';`
> returns one row). Log in as **superadmin** or **admin**. You need at least **three branches**: two
> `active` and one `inactive` (Settings → Branches → toggle one off). A second browser profile logged in
> as a **receptionist** is needed for the shell/attendance checks.
> Checks marked **(API)** must be run as a direct call with a bearer token from devtools — the point
> is that the server enforces what the UI hides.
>
> Reasoning and code pointers are in `ai_docs/DECISIONS.md` → **DEC-110**.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### Migration / backfill (run once, before anything else)

- [ ] `select id, email, branch_id, branch_ids from employee_accounts;` — every employee that had a
      `branch_id` now has `branch_ids = {that id}`; employees with no `branch_id` have `{}`.
- [ ] No row was changed other than the new column (spot-check name, role, salary on three rows).
- [ ] Re-run the migration file — it completes without error and changes nothing (idempotent).

### Add Employee — only active branches, several allowed

- [ ] Admin → Employees → **Add Employee**. The **Assigned Branches** field is a list of tick boxes,
      not a dropdown.
- [ ] The **inactive** branch is **not** listed. Both active branches are.
- [ ] If the *first* branch in your list (by sort order) is the inactive one, the form still opens with
      the first **active** branch pre-ticked (it used to pre-select the first branch regardless).
- [ ] Tick a second branch. The first-ticked one shows a **Primary** badge; the other shows a
      **Make primary** button. Click it — the badge moves.
- [ ] Untick every branch: an inline red "Select at least one branch." appears; clicking **Send
      Invitation** shows the same message as an alert and **nothing is sent** (Network tab: no POST).
- [ ] Tick two branches, fill name/email/role, submit. In Supabase:
      `branch_id` = the Primary branch, `branch_ids` = both ids, Primary first.
- [ ] Reload the roster: the Branch column lists **both** branch names, primary first (table and the
      mobile card).

### Add Employee — Doctor

- [ ] Choose a Doctor role. The same tick-box list is used (there is no second "Assigned Branches"
      chip row inside the Doctor panel any more).
- [ ] Tick two branches: the "Configure Schedule For Specific Branch" tabs appear for exactly those
      two branches; saving works.
- [ ] The doctor appears in Admin → Doctors and is bookable at **both** branches in the booking flow;
      `providers.branch_id` is the primary branch.

### Edit Employee — existing assignments, including an inactive one

- [ ] Edit an employee with one branch: that branch is ticked, **Primary** badge, nothing else ticked.
- [ ] Add a second branch, save, reopen: both ticked, order preserved.
- [ ] Take an employee assigned to branch X, then **deactivate** branch X in Settings → Branches.
      Edit that employee: branch X is **still listed and ticked**, with an amber **Inactive** badge
      (hover shows the explanation). Change only the phone number and save — branch X is **still**
      assigned afterwards (`branch_ids` unchanged in Supabase).
- [ ] On that same employee, untick branch X and save: it is removed. Reopen: branch X is no longer
      offered anywhere (an inactive branch cannot be newly assigned).
- [ ] Edit a *different* employee who was never on branch X: branch X is not listed.
- [ ] Edit a legacy employee with no branch (e.g. one provisioned from Role Management): nothing is
      pre-ticked; you must pick a branch to save.

### Server enforcement **(API)**

- [ ] `POST /api/employees` with `branchIds: []` → **400** "At least one branch is required.", and no
      user appears in Supabase → Authentication → Users.
- [ ] With the **inactive** branch id → **400** "...inactive and cannot be newly assigned.", no user
      created.
- [ ] With `["<id>","<id>"]` (duplicate) → **400** "selected more than once".
- [ ] With a random uuid → **400** "does not exist". With `"abc"` → **400** "not valid" (not a 500).
- [ ] With the legacy `branchId: "<active id>"` and no `branchIds` → **201**; `branch_ids` has one item.
- [ ] With **no** branch field at all (what Role Management → provision sends) → **201**, account has
      `branch_id` null and `branch_ids {}`.
- [ ] `PATCH /api/employees` `{ "id": "...", "branchIds": [] }` → **400**, employee unchanged.
- [ ] `PATCH` `{ "id": "...", "branchId": null }` → **400** (it no longer silently clears the branch).
- [ ] `PATCH` `{ "id": "...", "phone": "0100..." }` (no branch field) → 200, branch untouched.
- [ ] `GET /api/employees` — every row has a `branch_ids` array, primary first, including employees
      whose row you set to `branch_ids = '{}'` while keeping `branch_id`.

### Consumers (receptionist account on two branches, A primary and B)

- [ ] **Shell branch lock:** log in as that receptionist. The top bar shows a branch **dropdown**
      listing only A and B, and lands on **A**. Switch to B — the bookings list changes to B. Open
      Profile and Employees-adjacent screens that refresh the employee list; the selection **stays
      on B** (it does not snap back to A).
- [ ] A receptionist with a **single** branch still sees the fixed, non-clickable branch label.
- [ ] An admin/superadmin still sees the dropdown with every branch (unchanged).
- [ ] **Reception dashboard header** names the branch currently selected (B after switching), not
      always A.
- [ ] **Shift start / GPS check-in** (needs a phone or devtools sensor override): standing at branch
      B, the receptionist can start the shift and check in; standing far from both A and B they are
      refused ("must be in a working location"/"Out of Location"). A single-branch receptionist at
      the *other* branch is still refused by `POST /api/hr/attendance` (800 m rule unchanged).
- [ ] **HR → Roster** lists both branch names for the multi-branch employee.
- [ ] **Profile** (receptionist → Profile) lists both branches under "Branches".

### Arabic / RTL / mobile

- [ ] Switch the admin to Arabic. The picker label, hint, **أساسي** badge, **غير نشط** badge and
      "اجعله أساسياً" button render correctly; branch names are Arabic; the list reads right-to-left
      with the checkbox on the right edge.
- [ ] At a 375px-wide viewport the list is a single column, every row is comfortably tappable
      (about 44px high), and the page does not scroll horizontally.

### Regression

- [ ] Add a plain receptionist with **one** branch exactly as before — works, behaves as a single-branch
      employee everywhere above.
- [ ] Reset an employee's password / resend invite / change role — still work (they never touch branches).
- [ ] `npm run typecheck`, `npm run test`, `npm run build` are green.
