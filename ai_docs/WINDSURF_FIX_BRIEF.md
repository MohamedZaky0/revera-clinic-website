# Windsurf Fix Brief — Reception ↔ Doctor Workflow Defects

> **Read this entire file before writing a single line of code.**
> Every defect below has already been investigated and root-caused. The diagnosis is correct.
> Your job is to apply the specified fixes — **not** to re-diagnose, redesign, or improve anything.

---

## HARD RULES — violating any of these makes the work unusable

1. **Do not create new files** unless a task explicitly says "create". Only one task does (TASK-1).
2. **Do not refactor, rename, reformat, or "clean up" anything** you were not told to change.
   No changing quote styles, no reordering imports, no extracting helpers, no converting to
   TypeScript types, no adding comments to unrelated code.
3. **Do not add new features, settings, toggles, or UI elements** beyond what each task specifies.
4. **Do not touch any file not listed in the task you are working on.**
5. **Do not invent database columns.** The schema is documented in `ai_docs/DB_SCHEMA.md`. If a fix
   seems to need a column that does not exist there, **stop and report it** — do not write code that
   references it, and do not silently pick a different column.
6. **Never write a fallback that fabricates data.** If a value cannot be resolved, render `"—"` or
   `null` — never a placeholder name, never an index-derived guess, never a default that looks real.
   Several defects in this list exist *because* someone did that.
7. **Never report success on a failure path.** If a request fails, the user must see an error. No
   `alert("saved")` in an `else` branch. No closing a modal as if the write succeeded.
8. **One task = one commit.** Do not bundle tasks. Do not start the next task until the current one
   is complete and type-checks.
9. **After each task run:** `npx tsc --noEmit` and `npx eslint <the files you touched>`. Both must be
   clean on the files you touched before you move on. Do not "fix" unrelated pre-existing errors.
10. **If a task's described code does not match what you find in the file, STOP.** Report the
    discrepancy and wait. Do not guess at the intent, and do not apply the fix somewhere that
    "looks close enough."
11. **Do not modify** `ai_docs/*`, `supabase/migrations/*` (except where TASK-1 says to),
    `ROADMAP.md`, `TODO.md`, `FUTURE_FEATURES.md`, or `AI_PIPELINE.md`.
12. **Brand rules:** no new raw hex colors in components (use `var(--cr-primary)` / `var(--cr-accent)`
    from `globals.css`); no hardcoded "Revera", phone numbers, or logo paths (UI copy →
    `src/lib/translations.ts`, client values → `src/config/client.ts`).

---

## Context you need

- Stack: Next.js App Router + TypeScript + Supabase (Postgres). Single-tenant per clinic.
- `reservations` is the booking table. Read its columns in `ai_docs/DB_SCHEMA.md` before any task
  that touches booking data. **There is no `price` column and no `payment_status` column** — two
  defects below exist precisely because code assumes otherwise.
- The API returns reservation rows through `mapRow()` (`src/app/api/reservations/route.ts:22-30`),
  which converts snake_case DB columns to **camelCase** keys (`service_id` → `serviceId`,
  `amount_paid` → `amountPaid`, etc.). Client code that reads snake_case off an API response is
  reading `undefined`.
- Full write-ups of every defect are in `ai_docs/RISKS.md` as **RISK-038 through RISK-048**. Each
  task below cites its RISK number — read that entry if you need more background.

---

# TASKS — in this order

## TASK-1 — Persist the doctor's recalculated session total (RISK-038)

**Problem:** When a doctor completes a session, the recalculated invoice total (base service +
products + extra pulses + additional services) is sent as a field called `price`, which does not
exist on `reservations` and is not read by the PATCH handler. The entire total is silently discarded.
Additionally, `additionalServices` never even reaches the total being computed.

**Files:**
- `src/components/admin/doctor/tabs/DoctorOngoingSessionTab.tsx`
- `src/components/admin/DoctorAccountView.tsx`

**Do this:**

1. In `DoctorOngoingSessionTab.tsx`, the `additionalServices` state (around line 139) is local and
   never leaves the component. Lift it to the parent: add a callback prop (e.g.
   `onAdditionalServicesChange`) that fires whenever `additionalServices` changes, and call it.
   **Do not** restructure the component or move other state.
2. In `DoctorAccountView.tsx`, hold that value and include the additional-services subtotal in
   `updatedInvoiceTotal` (currently around line 636:
   `baseBookingPrice + productsSubtotal + extraPulsesSubtotal`).
3. In `handleCompleteTreatment` (around lines 866-874), change the PATCH body: **remove `price`**
   and send `amountLeft` instead, computed as `updatedInvoiceTotal - <amount already paid>`.
   Read the already-paid figure from the reservation object the component already has (the camelCase
   `amountPaid` key — see the mapRow note above). Do not send `amountPaid` — it must not be
   overwritten here, because the patient has not paid at this point.
4. Verify against `src/app/api/reservations/route.ts:750` that the field names you send are actually
   in the PATCH handler's destructured whitelist. If `amountLeft` is not accepted there, **stop and
   report** — do not add it to the route yourself without saying so.

**Do NOT:** add a `price` column, change how products or pulses write to their own endpoints, or
alter `computeSettledBalances`/`src/lib/billing.ts`.

**Done when:** completing a session with an added service/product results in the reservation's
`amount_left` reflecting the true total, verified by reading the row back.

---

## TASK-2 — Stop fabricating payment status, doctor and room (RISK-039)

**Problem:** The booking row mapper invents values when real ones are missing, and renders them as
if real. Any completed booking is labelled "Paid" without ever checking the money fields.

**File:** `src/components/admin/bookings/AdminBookingsView.tsx` (the row-mapping block, ~lines 195-239)

**Do this:**

1. **Payment status (line 225).** Delete the entire fallback chain. Compute the label *only* from
   the real money fields on the reservation (`amountPaid` / `amountLeft`, camelCase — see mapRow note):
   - `amountPaid <= 0` → `"Unpaid"`
   - `amountPaid > 0` and `amountLeft > 0` → `"Partially Paid"`
   - `amountLeft <= 0` and `amountPaid > 0` → `"Paid"`
   - any field missing/non-numeric → `"—"`
   **Never** derive payment state from `status`. A booking's status and its payment state are
   independent facts.
2. **Doctor name (lines ~200-217).** Delete the `allProv[idx % allProv.length]` fallback and the
   hardcoded `"Dr. Sara Ahmed"` literal. If no real doctor resolves, render `"—"`.
3. **Room (line ~219).** Delete the `` `Room ${(idx % 3) + 1}` `` fallback. If no real room
   resolves, render `"—"`.

**Do NOT:** redesign the table, change columns, restyle badges, or touch `getStatusConfig()`.

**Done when:** no value rendered by this component can originate from an index, a modulo, or a
hardcoded name.

---

## TASK-3 — Stop orphaning and duplicating public bookings (RISK-040)

**Problem:** The reservation row is created at the end of step 2, before deposit payment. "Cancel &
Return" on step 3 clears only browser state, leaving the row in the database. Re-submitting step 2
creates a *second* row. Every retry leaves another orphan.

**File:** `src/components/BookingModal.tsx`

**Do this:**

1. In the "Cancel & Return" handler (~lines 1663-1674), before `setStep(2)` and
   `setCreatedReservation(null)`, PATCH the existing reservation to `status: 'cancelled'` using
   `createdReservation.id`. Await it. If it fails, show the user an error and **do not** clear
   `createdReservation` — leaving it set is what prevents the duplicate on retry.
2. In `handleConfirm` (~lines 677-714), guard against re-creating: if `createdReservation` is
   already set and non-null, PATCH that existing reservation with the updated details instead of
   firing a new `POST /api/reservations`.

**Do NOT:** move where the reservation is created (do not restructure the step flow), change the
deposit logic, or alter `handlePayDeposit`. This component has a history of subtle regressions
(RISK-010/011/029/035) — keep the change surgical.

**Done when:** cancelling from the payment step and re-booking produces exactly one reservation row,
and the abandoned one is `cancelled`, not left `pending_deposit`.

---

## TASK-4 — Admin New Booking: capture payment, delete the broken fallback (RISK-041)

**Problem:** Two defects. (a) Staff-created bookings always write `amount_paid = 0` with no way to
record money taken at the desk. (b) A "fallback insert" uses column names that do not exist on
`reservations`/`customers`, so it can never succeed — and the handler reports success regardless.

**File:** `src/components/admin/bookings/AdminNewBookingView.tsx`

**Do this:**

1. **Delete the entire direct-Supabase fallback block (lines ~509-558)** and the `success` flag
   machinery around it. If `POST /api/reservations` fails, show the error to the user and **return
   early** — do not call `onBookingCreated()`, do not call `onClose()`. Those currently fire
   unconditionally at lines ~570-571; they must only run on a confirmed successful response.
2. **Add deposit capture to the form.** Add a single numeric input labelled "Amount Paid Now"
   (default `0`) plus its state. Include it in the payload (lines ~472-487) as `amountPaid`, and
   send `amountLeft` as `<service price> - <amount paid now>`. Match the existing form's styling —
   copy the pattern from an adjacent input in the same file; do not introduce new design.
3. Confirm `amountPaid`/`amountLeft` are accepted by `POST /api/reservations` — they are read at
   `src/app/api/reservations/route.ts:677-678`. Note that `isManual: true` bypasses the deposit
   branch, which is why the sent values are used as-is; that behavior is correct, leave it.

**Do NOT:** add a payment-method selector, build an invoice UI, or wire this to the POS/packages
endpoints. Just the amount field and honest error handling.

**Done when:** a failed booking shows an error and keeps the form open; a successful one records the
amount reception actually collected.

---

## TASK-5 — Approve Request: use the patient's real requested time, drop the hardcoded doctor (RISK-047)

**Problem:** Opening a pending booking to approve it pre-fills the *first available slot of the day*
(09:00) instead of what the patient requested, and pre-selects a hardcoded doctor name for every
booking.

**File:** `src/app/admin/page.tsx` — `openApprove` (~line 7568) and `refreshApproveAvailability`
(~lines 7554-7566)

**Do this:**

1. In `openApprove`, set the time slot from `r.requestedTime` (this field exists and is populated —
   it is used at line ~23554). Only fall back to the first-available-slot logic when
   `r.requestedTime` is genuinely empty.
2. If the patient's requested time is **not** in the available-slot list, still select it, and show a
   clear inline warning next to the field (e.g. "Requested time is unavailable — choose another").
   Reception must see the conflict rather than have it silently swapped.
3. **Delete `setDoctorName("Dr. Sara El Gamel")` at line ~7573.** Set the doctor from the
   reservation's own `doctorName` if present; otherwise leave the field empty.

**Do NOT:** change the availability-computation logic itself, or alter the approve PATCH call.

---

## TASK-6 — Prescription: report real failures, and resolve the duplicate editor (RISK-045)

**Problem:** A failed prescription save shows "Prescription recorded for session." — a
success-sounding message on the failure path. The doctor cannot tell a saved prescription from a
lost one. Separately, two independent prescription editors exist with unshared state.

**Files:**
- `src/components/admin/doctor/tabs/DoctorOngoingSessionTab.tsx` (~lines 230-235)
- `src/components/admin/doctor/modals/DoctorPrescriptionModal.tsx`

**Do this:**

1. Fix the failure path: on `!res.ok`, show an explicit error containing the server's message, and
   leave the doctor's entered text intact so it can be retried. Do not clear the form on failure.
2. Report — **do not fix without asking** — which of the two prescription editors is the intended
   one. Describe in your report what each writes and where it is reachable from. **Wait for a
   decision before removing or merging either.**

**Do NOT:** change `src/app/api/prescriptions/route.ts`, or alter the prescription data shape.

---

## TASK-7 — Gate the pulse counter; show out-of-stock; fix Primary Service preselection (RISK-048)

**File:** `src/components/admin/doctor/tabs/DoctorOngoingSessionTab.tsx`

**Do this:**

1. **Primary Reserved Service (line ~634):** the code reads `activeSessionBooking.service_id`, but
   the API returns **`serviceId`** (camelCase — see the mapRow note at the top of this file). Change
   it to read `serviceId`. Keep the existing string-matching fallback only for when `serviceId` is
   genuinely absent.
2. **Pulse counter (badge at lines ~613-618, and the per-service override input):** render these
   **only** when the selected service is actually device/laser-linked. Determine that from existing
   service data — check for a device/pulse-related field on the service record in
   `ai_docs/DB_SCHEMA.md` (`services` table) or on the inventory device linkage. **If no such field
   exists, STOP and report it** — do not invent a field, and do not hardcode a list of service names.
3. **Default pulses (line ~142):** stop defaulting to `100` for services with no linked device.
   Default to `0` or leave empty in that case.
4. **Out-of-stock indicator (product `<select>`, lines ~764-770):** append `— Out of Stock` to the
   option label and disable that option when the product's stock quantity is `<= 0`. Read the
   quantity from whatever field the products API already returns. **If the API does not return a
   quantity, STOP and report it** — do not add a new endpoint or query.

---

## TASK-8 — New Booking not visible until manual refresh (RISK-041 note / cache)

**Problem:** `fetchAllReservations()` (`src/app/admin/page.tsx:7482`) goes through
`cachedFetch(...)` (`src/lib/fetchCache.ts`) — a module-level cache with a 2-second TTL and **no
invalidation on writes**. Refetching immediately after creating a booking returns the stale array,
so the new booking is missing until a full page reload clears the in-memory cache.

**Files:** `src/app/admin/page.tsx`, and read `src/lib/fetchCache.ts` (a `clearFetchCache` function
is already exported at ~line 39 — **use it, do not write a new cache layer**)

**Do this:**

1. Call the existing `clearFetchCache` for the reservations URL immediately before
   `fetchAllReservations()` runs in the post-create callback (wired at ~lines 23193 and 23241).
2. Apply the same invalidation to the other reservation-mutating paths in this file (approve,
   reject, cancel, check-in, start/complete session) — anywhere a write is followed by a refetch.

**Do NOT:** change the cache TTL, rewrite `fetchCache.ts`, or introduce a state-management library.

---

## TASK-9 — Do NOT fix these; report only

These need a product decision or a schema migration and are **explicitly out of scope for you**.
Do not touch them. They are listed so you recognize them and leave them alone:

- **RISK-042** (wallet not deducted on POS wallet payments; package sales not updating
  `spent_amount`/`outstanding`; `wallet_txns` never written) — accounting change, needs sign-off.
- **RISK-043** (no `started_at` column, sessions never expire) — needs a DB migration.
- **RISK-044** (summary cards unbounded periods; `postponed` counted as `cancelled`) — the correct
  period is an unmade product decision.
- **RISK-046** (failed `checked_in` write returns `checked_in` anyway) — API-layer change, needs
  sign-off.
- Reception role permissions / RISK-036 route authorization — separate security workstream.

---

# REPORTING — required after every task

For each task, report:
- Files changed, with the specific change per file in one line each.
- Output of `npx tsc --noEmit` and `npx eslint <touched files>`.
- Anything you were told to STOP on, quoted exactly, with what you found instead.
- Anything you chose not to change and why.

**If you are unsure about anything, stop and ask. A stopped task is recoverable; a wrong "fix"
applied across a file is not.**
