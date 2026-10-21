/**
 * RISK-128: the browser key ships in every page, so a policy such as `USING (true)` hands a table to anybody who
 * opens the site. Twelve tables were open that way for months before anyone noticed. This reads the migrations
 * as text and fails when a new one repeats the mistake. It does not touch a database: to check a live project
 * (every new clinic gets its own), run `node scripts/check-anon-access.mjs`.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'supabase', 'migrations');

// The baseline predates the fix; the closing migration is the fix (it re-creates read access for two tables on purpose).
const GRANDFATHERED = new Set(['20260726000000_dev_schema_baseline.sql', '20261023000000_close_open_rls_policies.sql']);

// Created without turning row-level security on; the closing migration turns it on for every table it finds, so
// databases built through that migration are fine. Nothing new belongs here: enable RLS in the migration that creates the table.
const RLS_ENABLED_LATER = new Set(['20260726163000_setup_terms_and_conditions.sql']);

const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const read = (f: string) => readFileSync(path.join(DIR, f), 'utf8');

/** Statements of a migration with comments removed, split on `;`. */
function statements(sql: string): string[] {
  return sql
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

describe('migrations keep row-level security closed', () => {
  it('finds the migrations folder', () => {
    expect(files.length).toBeGreaterThan(1);
  });

  it('no new policy lets everybody in (USING (true) / WITH CHECK (true)) unless it is for service_role', () => {
    const offenders: string[] = [];
    for (const f of files.filter((x) => !GRANDFATHERED.has(x))) {
      for (const s of statements(read(f))) {
        if (!/^CREATE POLICY/i.test(s)) continue;
        const open = /(USING|WITH CHECK)\s*\(\s*true\s*\)/i.test(s);
        const serviceOnly = /\bTO\s+"?service_role"?/i.test(s);
        if (open && !serviceOnly) offenders.push(`${f}: ${s.slice(0, 120)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every table created after the baseline turns row-level security on', () => {
    const allSql = files.map(read).join('\n');
    const rlsOn = new Set(
      [...allSql.matchAll(/ALTER TABLE\s+(?:ONLY\s+)?(?:"?public"?\.)?"?([a-z0-9_]+)"?\s+ENABLE ROW LEVEL SECURITY/gi)].map((m) => m[1].toLowerCase()),
    );
    const missing: string[] = [];
    for (const f of files.filter((x) => !GRANDFATHERED.has(x) && !RLS_ENABLED_LATER.has(x))) {
      for (const m of read(f).matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+(?:"?public"?\.)?"?([a-z0-9_]+)"?/gi)) {
        const table = m[1].toLowerCase();
        if (!rlsOn.has(table)) missing.push(`${f}: ${table}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('catches the mistake it exists for (self-check of the rules above)', () => {
    const bad = 'CREATE POLICY "Allow all" ON public.x FOR SELECT USING (true);';
    expect(/(USING|WITH CHECK)\s*\(\s*true\s*\)/i.test(statements(bad)[0]) && !/\bTO\s+"?service_role"?/i.test(bad)).toBe(true);
    const ok = 'CREATE POLICY "svc" ON public.x FOR ALL TO "service_role" USING (true);';
    expect(!/\bTO\s+"?service_role"?/i.test(ok)).toBe(false);
  });
});
