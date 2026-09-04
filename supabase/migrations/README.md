# supabase/migrations — How to Run

> **Last Updated:** 2026-07-26
> **Status:** The Supabase CLI is configured and linked to the dev database. The verified dev schema
> is captured in `20260726000000_dev_schema_baseline.sql`; the linked database records that baseline
> as its sole applied migration. The 32 superseded scripts are preserved under `_legacy/` for history.

---

## Why this changed

The old process — paste each `.sql` into the Dashboard SQL Editor by hand — has no record of what
ran. That is not a theoretical problem; it has already caused real damage (RISK-020):

- The **dev** and **main** databases diverged badly. dev has 26 tables and is current to
  ~2026-07-20. main has 19 and is stuck at ~2026-07-05, missing 8 tables the application code
  actively uses.
  **RESOLVED 2026-09-04** — by then the gap had grown to 19 tables on prod vs 59 on dev, with
  prod's migration history completely empty. `supabase db reset --linked` replayed and recorded
  all 51 migrations against prod, and a seed file restored its config tables and `auth` users
  from a pre-flight dump. Both databases now report identical table sets, and prod is provisioned
  the same reproducible way any future clinic fork will be. Full write-up: `ai_docs/RISKS.md`
  -> RISK-020, "Update 2026-09-04".
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

### 2. One-time baseline adoption — completed 2026-07-26

A direct `npx supabase db dump --linked --schema public` generated
`20260726000000_dev_schema_baseline.sql`. The previous 32 scripts are in `_legacy/`; they are kept
for historical decisions but are not part of the active migration sequence.

`npx supabase migration repair` replaced the linked dev project's 32 legacy history entries with
`20260726000000`. `npx supabase db pull --schema public` now provisions a shadow database, applies
the baseline, and finds no schema diff. Its non-zero "No schema changes found" exit is the CLI's
expected no-op result, not a failed baseline replay.

The baseline includes the live-dev-only `admin_roles` table. `employees` remains main-only and must
be assessed before main is reconciled.

### 3. Everyday use, once step 2 is done

```bash
npx supabase migration new short_description   # creates a timestamped empty file
# ...write the SQL...
npx supabase db push                           # applies only what has not been applied
```

`db push` records applied migrations in `supabase_migrations.schema_migrations`, so "did this run?"
stops being a guess.

---

### Dev baseline verification

The linked dev migration history contains only `20260726000000`, and `db pull` verifies that the
baseline reproduces the remote public schema with no diff. The baseline includes the previously
verified RLS, medical-record, POS, provider-link, and duration changes.

---

## Idempotency

The baseline is a snapshot for provisioning a new database and must not be reapplied to an existing
schema. The Supabase CLI records it in `supabase_migrations.schema_migrations` so `db push` applies
it only once.

Every future migration must be explicitly idempotent: use `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN
IF NOT EXISTS`, and `DROP POLICY IF EXISTS` before `CREATE POLICY` where appropriate. Do not restore
or execute files in `_legacy/`; they exist only as historical references.

---

## Adding a new migration

1. `npx supabase migration new short_description` (or hand-name it `YYYYMMDDHHMMSS_description.sql`,
   UTC, sorting after the newest file).
2. Write it idempotently.
3. Enable RLS explicitly on any new table — the baseline captures current RLS state only and is not
   a trigger for tables created later.
4. Run it against dev and verify.
5. **Update `ai_docs/DB_SCHEMA.md` in the same commit** (CLAUDE.md hard rule 6).
6. Record in `ai_docs/FINANCE_TRACKER.md` that it has been run, and against which database.

## Rule: keep this folder and `ai_docs/` in sync

Any schema change must land as a `.sql` file here **and** be reflected in `ai_docs/DB_SCHEMA.md`
(and `ai_docs/ARCHITECTURE.md` if the table list changes) in the same commit. See
`ai_docs/README.md` → "When to Update These Docs".

**And never write into the docs that something is applied unless you have measured it.**
