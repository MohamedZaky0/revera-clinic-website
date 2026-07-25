# supabase/migrations — How to Run

> **Last Updated:** 2026-07-25
> **Status: mid-transition.** The Supabase CLI is now configured (`supabase/config.toml`), but the
> project has not been linked and no baseline has been pulled yet. Until step 2 below is done,
> migrations are still applied by hand. See `ai_docs/FINANCE_TRACKER.md` task 0.0.

---

## Why this changed

The old process — paste each `.sql` into the Dashboard SQL Editor by hand — has no record of what
ran. That is not a theoretical problem; it has already caused real damage (RISK-020):

- The **dev** and **main** databases diverged badly. dev has 26 tables and is current to
  ~2026-07-20. main has 19 and is stuck at ~2026-07-05, missing 8 tables the application code
  actively uses.
- `20260722140000_enable_row_level_security.sql` was **never applied to dev**, so RLS is off on
  `reservations`, `customers`, `services` and others — while `ai_docs/DB_SCHEMA.md` briefly claimed
  the opposite, because someone (an AI assistant) inferred applied state from the file existing.
- `20260725120000_backfill_medical_and_product_balance_tables.sql` was committed but never run, so
  `medical_records`, `medical_reports` and `customer_product_balances` do not exist and their API
  routes are silently running on JSON-file fallback.
- Two tables exist live that no migration creates and no doc mentions: `admin_roles` (both
  databases) and `employees` (main only).

**A file in this folder proves nothing about any database.** Verify before you rely on anything.

This also matters commercially: DEC-001 commits to fork-per-client with a **separate Supabase
project per clinic**. Hand-applying 30 files per onboarding is a scaling defect, not a one-off.

---

## Verify what is actually in a database

```sql
-- every table
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;

-- one table's columns
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = '<table>'
order by ordinal_position;

-- RLS state
select tablename, rowsecurity from pg_tables
where schemaname = 'public' order by tablename;
```

---

## Target process (CLI)

### 1. One-time per developer

```bash
npx supabase login
npx supabase link --project-ref <project-ref>   # from the Supabase dashboard URL
```

`--project-ref` is not a secret, but the database password prompted during `link` is. Never commit
it. `supabase/.gitignore` already excludes `.env.local` and `.env.*.local`.

### 2. One-time for the repo — establish the baseline (NOT DONE YET)

```bash
npx supabase db pull --schema public
```

This generates a migration **from the live database**, which is the only trustworthy description of
the schema. Do this against **dev**, since it is the more current of the two.

Then:
1. Review the generated file — it will include `admin_roles` and `employees`, which are undocumented.
   Decide whether they are live or dead before keeping them.
2. Move the 30 legacy hand-written files to `supabase/migrations/_legacy/` for history. Do **not**
   delete them; several document decisions that are not obvious from the schema alone.
3. Update `ai_docs/DB_SCHEMA.md` to match the pulled baseline exactly.
4. Bring **main** up to the baseline and confirm the two databases match.

Consolidating now is cheap precisely because production is not live yet. It will not stay cheap.

### 3. Everyday use, once step 2 is done

```bash
npx supabase migration new short_description   # creates a timestamped empty file
# ...write the SQL...
npx supabase db push                           # applies only what has not been applied
```

`db push` records applied migrations in `supabase_migrations.schema_migrations`, so "did this run?"
stops being a guess.

---

## Interim process (until step 2 is done)

Still by hand: Dashboard → **SQL Editor → New Query**, paste, run, confirm in Table Editor.

**Then record it.** Update the migration table in `ai_docs/FINANCE_TRACKER.md`, stating which
database you ran it against. A migration that is committed but not run is worse than one that does
not exist, because it looks done.

### Pending, not yet run against dev

| Migration | Effect until run |
|---|---|
| `20260722140000_enable_row_level_security.sql` | RLS off on the patient-data tables |
| `20260725120000_backfill_medical_and_product_balance_tables.sql` | 3 tables missing; routes on JSON fallback |
| `20260725160000_add_customer_id_to_product_sales.sql` | POS sales still fail into the `page_settings` blob (RISK-014) |
| `20260725170000_ensure_reservation_status_check.sql` | `pending_deposit` may be rejected — and the fallback that used to hide this has been removed, so it will now fail loudly |

---

## Idempotency

Every script here uses `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`,
`DROP POLICY IF EXISTS` before `CREATE POLICY`, and so on — safe to re-run.

**Two known hazards when re-running in filename order:**
- `20260715202003_add_provider_payroll.sql:26` runs `ALTER TABLE doctor_payroll DISABLE ROW LEVEL
  SECURITY`. Re-running it after the RLS-enable migration silently turns RLS back off. Same for the
  `DISABLE` statements throughout `20260705141242_full_migration.sql`.
- `20260705141244_setup_supabase_schema.sql` sorts *after* `20260705141242_full_migration.sql` but
  is an **older, narrower** version of the same schema. Harmless only because of `IF NOT EXISTS`.
  Treat `full_migration.sql` as authoritative; never use `141244` as a schema reference.

Both disappear once the baseline in step 2 replaces these files.

---

## Adding a new migration

1. `npx supabase migration new short_description` (or hand-name it `YYYYMMDDHHMMSS_description.sql`,
   UTC, sorting after the newest file).
2. Write it idempotently.
3. Enable RLS explicitly on any new table — the blanket enable migration is a one-shot `DO` block,
   not a trigger, and has not been applied anyway.
4. Run it against dev and verify.
5. **Update `ai_docs/DB_SCHEMA.md` in the same commit** (CLAUDE.md hard rule 6).
6. Record in `ai_docs/FINANCE_TRACKER.md` that it has been run, and against which database.

## Rule: keep this folder and `ai_docs/` in sync

Any schema change must land as a `.sql` file here **and** be reflected in `ai_docs/DB_SCHEMA.md`
(and `ai_docs/ARCHITECTURE.md` if the table list changes) in the same commit. See
`ai_docs/README.md` → "When to Update These Docs".

**And never write into the docs that something is applied unless you have measured it.**
