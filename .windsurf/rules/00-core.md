---
trigger: always_on
---

# Core rules — Revera clinic platform

Every rule below exists because it was **actually violated in this repository** and caused a real
defect. None are hypothetical. Read the reason, not just the rule.

## 1. Never turn "unknown" into a value

A missing/`null` field is not zero, not an empty string, not a plausible default. Render `"—"`,
return `null`, or surface an error.

- **What happened:** `Number(r.amountLeft ?? 0)` — `amount_left` is nullable, so a booking whose
  balance was never recorded became "balance = 0" and the UI displayed **"Paid"** for an unpaid
  booking. The `isNaN` guard written alongside it was dead code, because `?? 0` ran first.
- Before writing `?? 0`, `|| 0`, `|| "Unknown"`, `|| someDefault`: check whether the column is
  nullable in `ai_docs/DB_SCHEMA.md`. If it is, the null case needs its own branch.
- Never derive a money/payment state from a status string. `status === 'completed'` does **not**
  mean paid. Read the actual money columns.

## 2. Never invent fallback data

No index-derived values, no rotating picks from a list, no hardcoded names.

- **What happened:** when a doctor couldn't be resolved, the code fell back to
  `allProv[idx % allProv.length]` (an arbitrary *other* doctor) and then to the literal
  `"Dr. Sara Ahmed"`. Rooms fell back to `` `Room ${(idx % 3) + 1}` ``. Reception saw bookings
  attributed to doctors who never treated the patient — and because the values were index-derived,
  they were *stably* wrong, so they looked consistent and therefore believable.
- If you cannot resolve a real value: `"—"`. Always.

## 3. Trace every call end-to-end before declaring it done

Writing a correct request body is not the same as the request succeeding.

- **What happened (the worst defect of the whole audit):** two new `PATCH /api/reservations` calls
  were added from the public booking modal. Both bodies were correct. Neither was checked against
  the `requireStaffAccess` gate that route has had since 2026-07-26 — so both were silently
  rejected with 401. The "Cancel & Return" button never worked, and the duplicate-reservation bug
  they were written to fix was never actually fixed.
- Before finishing any task that adds or changes a `fetch` call, confirm all of:
  1. Does the target route require auth? Does this caller send it?
  2. Does the handler actually read every field being sent? (Check the destructuring line.)
  3. Does the response shape match what the caller expects?
- A field the handler never destructures is silently dropped. This has happened here more than
  once — `price` was sent to a route that has no `price` column and no `price` parameter, so an
  entire recalculated session total vanished with no error.

## 4. Never report success on a failure path

- **What happened:** a failed prescription save showed `alert("Prescription recorded for session.")`
  and the `catch` block showed `alert("Prescription saved.")`. Doctors had no way to know a
  prescription was lost.
- **What happened:** an admin booking form called `onBookingCreated()` and `onClose()`
  unconditionally, so a failed booking looked identical to a successful one.
- **What happened:** an API handler returned `{...row, status: 'checked_in'}` after the database
  had rejected `checked_in` and stored `confirmed` instead — the response lied about what was saved.
- Failure paths show the real error. API responses report what was actually written.

## 5. Do only what the task says

- **What happened:** a task list explicitly marked several risks "do not touch — needs a product
  decision." One was implemented anyway.
- **What happened:** `let min of` was changed to `const min of` in a file being edited for an
  unrelated reason. Harmless, but it is noise in a diff someone has to review.
- **What happened:** a documentation file unrelated to the task was deleted.
- No opportunistic refactors, renames, reformatting, import reordering, or lint cleanup in code you
  were not asked to change. No new files unless the task says "create".
- If you believe something out of scope needs fixing: **report it, do not do it.**

## 6. Finish every sub-point, or say which one you didn't

- **What happened:** a task had four numbered sub-points. Three were done, the fourth (stop
  defaulting pulses to `100`) was skipped, and the task was reported complete.
- **What happened:** cache invalidation was applied to 2 of ~20 call sites and reported as done.
  The bug persisted everywhere else.
- Re-read the task's numbered list before writing your report. State the status of each number
  individually. "Partially done, item 3 skipped because X" is a fine answer. Silently omitting it
  is not.

## 7. Documentation must match reality

- **What happened:** a `RISKS.md` entry stated a defect was "not yet fixed" when it had been fixed
  in an earlier commit — and another claimed a risk was fully resolved when two routes were still
  open.
- Before writing "fixed" / "resolved" / "not fixed" in `ai_docs/*`, verify against the current code
  with a grep or a file read. Do not describe the change you intended; describe the change that is
  in the file.

## 8. Stop instead of guessing

When the task says STOP, or when what you find doesn't match what the task describes: stop and
report. A stopped task is cheap. A wrong change applied across a dozen files is not.

Specifically stop if: a column/table/field the task assumes does not exist; the code at a cited
line is not what the task describes; a fix appears to require touching a file the task didn't list.

## 9. Verify before reporting

Run and paste real output — never claim these passed without running them:

```
npx tsc --noEmit
npx eslint <files you touched>
```

Both must show **0 errors** on touched files. Pre-existing warnings elsewhere are not yours to fix.
For anything touching routing, imports across route files, or server components, also run
`npm run build`.

## 10. Reporting format

For every task, state: files changed (one line each on what and why), the tsc/eslint output, the
status of each numbered sub-point, anything you stopped on with what you actually found, and
anything you chose not to change and why.
