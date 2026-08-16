---
trigger: always_on
---

# Database and schema rules

## The single source of truth

`ai_docs/DB_SCHEMA.md` is authoritative — **not your memory, not the older lines in other docs, and
not what the code appears to assume.** This project has a documented history of code referencing
columns that do not exist. Check the doc before using any column name.

Columns that were referenced in code but **never existed** (each caused a real, silent failure):
- `reservations.price` — a doctor's recalculated session total was PATCHed to it and vanished.
- `reservations.payment_status` — read by the bookings table, always undefined, which is why the
  fabricated "Paid" fallback fired for every completed booking.
- `branches.service_hours` — written by a route that reported HTTP 200 while saving nothing.
- `reservations.origin`, `reservations.cancelled_reason` — struck through in the schema doc
  specifically so they are not silently re-added.

If a fix seems to need a column that isn't in `DB_SCHEMA.md`: **stop and report.** Do not write code
that references it, and do not quietly substitute a different column.

## Migrations

- Any schema change requires **both** a new file in `supabase/migrations/` **and** the matching
  update to `ai_docs/DB_SCHEMA.md`, in the **same commit**. These must never drift.
  (This was violated as recently as 2026-08-17: `actual_duration_minutes` shipped with no schema
  doc entry.)
- Name files `YYYYMMDDHHMMSS_short_description.sql`, consistent with the existing folder.
- Use `ADD COLUMN IF NOT EXISTS` so re-running is safe.
- **Never apply a migration yourself.** No `supabase db push`, no direct SQL execution. The owner
  applies migrations manually. Say clearly in your report that the migration is unapplied.
- **Do not backfill** historical rows with computed or guessed values. If a session has no recorded
  start time, it has no duration — a guessed timestamp makes a stale record look fresh. State in
  your report that no backfill was attempted and why.

## camelCase vs snake_case — a recurring source of silent bugs

The database uses `snake_case`. `GET /api/reservations` maps rows through `mapRow()`
(`src/app/api/reservations/route.ts`) which returns **camelCase** to callers.

So a component reading an API response must use `serviceId`, `amountPaid`, `amountLeft`,
`startedAt`, `customerId` — **not** `service_id`, `amount_paid`, etc. Reading the snake_case key off
an API response yields `undefined`, silently.

- **What happened:** the doctor's session view read `activeSessionBooking.service_id`, which was
  never present, so the booked service never pre-selected and the code fell through to unreliable
  string matching against service names.

Components reading directly from Supabase (via `supabase.from(...)`) get snake_case. Some components
read from *both* sources — check which one a given value came from before assuming its casing.

## Deletes and cascades

Before writing any `delete`, check `DB_SCHEMA.md` for what cascades. `customers` cascades to
prescriptions, medical records, medical reports, wallet transactions, customer packages and package
items. Deleting a customer destroys their entire clinical and financial history.

Never write a bulk delete, a `TRUNCATE`, or a destructive migration unless the task explicitly asks
for one — and even then, deliver it as a `.sql` file for the owner to run, never executed by you.
