# supabase/migrations — How to Run

> **Last Updated:** 2026-07-21

These are **not** wired up to the Supabase CLI (there is no `supabase/config.toml`, no
`supabase link`, no local Supabase stack in this project). They are plain SQL scripts,
run manually through the **Supabase Dashboard → SQL Editor**. The filenames just follow
the CLI's timestamp-prefix convention so history stays sortable and mergeable.

## Running a migration

1. Open the Supabase project dashboard → **SQL Editor → New Query**.
2. Open the `.sql` file you need, copy the full contents, paste into the editor.
3. Run it.
4. Confirm the change in **Table Editor** (or re-run — every script is idempotent, see below).

## Running all of them on a fresh database

Run every file in this folder **in filename order** (they're timestamp-prefixed, so
alphabetical = chronological = dependency order). `20260705141242_full_migration.sql`
is a standalone consolidated snapshot covering everything up to that date — running it
plus every file after it is enough to reach current schema; the earlier individual
`setup_*` / `create_*` files that predate it are redundant with it but harmless to also
run since everything uses `IF NOT EXISTS`.

If you only need current schema, the fastest path is:
1. `20260705141242_full_migration.sql`
2. Every file after it, in order.

## Idempotency

Every script in this folder uses `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`,
`DROP POLICY IF EXISTS` before `CREATE POLICY`, etc. — safe to re-run against a database
that already has some or all of the change applied. Don't assume this for future files
unless you also write them that way.

## Adding a new migration

1. Create a new file here named `YYYYMMDDHHMMSS_short_description.sql` (UTC timestamp,
   `date -u +%Y%m%d%H%M%S`), timestamp must sort after the most recent file.
2. Write it idempotently (`IF NOT EXISTS` / `IF EXISTS` guards) — scripts get re-run manually
   and must not error on a second run.
3. Run it yourself in the Supabase SQL Editor (dev project) to verify it works before committing.
4. **Update `ai_docs/DB_SCHEMA.md`** with the new/changed table or column — this folder is the
   change log, `DB_SCHEMA.md` is the current-state reference; both are needed and can drift
   from the live database if only one is updated.

## Rule: keep this and `ai_docs/` in sync

Any schema change (new table, new/changed column, new constraint) must land as a new
`.sql` file here **and** be reflected in `ai_docs/DB_SCHEMA.md` (and `ai_docs/ARCHITECTURE.md`
if it changes the table list) in the same change. Do not let this folder and the docs
diverge — see `ai_docs/README.md` → "When to Update These Docs" for the full doc-sync rules.
