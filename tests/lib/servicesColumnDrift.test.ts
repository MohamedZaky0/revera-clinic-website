/**
 * Schema-drift guard: `public.services` has no `name` column (its display names are `en` / `ar`).
 * Selecting it makes PostgREST fail with 42703, and the callers swallow that error:
 *  - reservations/route.ts writeCheckoutInvoice: no invoice was written for ANY completed booking
 *    ("Failed to write Phase 1 invoice (dual-write, non-fatal)") — found in the live browser pass;
 *  - availability/route.ts: the cached service list silently became empty;
 *  - customers/packages/route.ts: the joined package query fell back and lost service names.
 * The in-memory Supabase fake does not validate columns, so no route test can catch this — hence a
 * source-level check. See DB_SCHEMA.md `services`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(full) ? [full] : [];
  });
}

const files = walk(join(process.cwd(), 'src'));

describe('services table column usage', () => {
  it("never selects a `name` column from public.services", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      // .from('services') ... .select('<columns>')
      for (const m of src.matchAll(/from\(\s*['"]services['"]\s*\)\s*\.select\(\s*(['"`])([^'"`]*)\1/g)) {
        if (/(^|[\s,(])name([\s,)]|$)/.test(m[2])) offenders.push(`${file}: select(${m[2]})`);
      }
      // PostgREST embeds: services ( ... name ... )
      for (const m of src.matchAll(/\bservices\s*\(([^)]*)\)/g)) {
        if (/(^|[\s,])name([\s,]|$)/.test(m[1])) offenders.push(`${file}: embed services(${m[1].trim()})`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
