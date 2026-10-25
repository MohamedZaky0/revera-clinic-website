/**
 * RISK-132 / DEC-127: the open patient profile's money fields (Total Spend / Outstanding / Wallet)
 * flickered because TWO effects in src/app/admin/page.tsx wrote them: one copied the RAW stored
 * `dbCustomers` record, the other the DERIVED `customers` row (stored vs bookings, DEC-121). They
 * undid each other on every render, for any patient whose stored and calculated figures differ.
 *
 * Mounting the 11k-line admin page in a test is not practical, so this guards the wiring itself:
 * the page must have exactly ONE writer, and it must be fed from the derived `customers` list.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PAGE = readFileSync(path.join(__dirname, '../../src/app/admin/page.tsx'), 'utf8');

describe('open profile financial sync (page.tsx wiring)', () => {
  it('uses the shared hook fed with the derived customers list', () => {
    expect(PAGE).toMatch(/useOpenProfileFinancialSync\(\s*customers\s*,\s*viewingCustomerProfile\s*,\s*setViewingCustomerProfile\s*\)/);
  });

  it('has no effect that copies the raw dbCustomers record into viewingCustomerProfile', () => {
    // The old second writer looked the open customer up in the raw list and compared fresh.spent_amount.
    expect(PAGE).not.toMatch(/dbCustomers\.find\([^)]*\)[^;]*;\s*\n\s*if \(!fresh\) return;/);
    expect(PAGE).not.toMatch(/fresh\.spent_amount\s*!==\s*viewingCustomerProfile\.spent_amount/);
  });

  it('writes the profile money fields from exactly one place', () => {
    const writers = PAGE.match(/setViewingCustomerProfile\(\s*\(prev: any\)\s*=>\s*prev\s*\?\s*\{\s*\.\.\.prev,\s*spent_amount/g) ?? [];
    expect(writers.length).toBe(0); // the only writer now lives in useOpenProfileFinancialSync.ts
  });
});
