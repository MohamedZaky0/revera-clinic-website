/**
 * Tests for src/lib/age.ts — `calculateAge` backs the patient profile's optional date-of-birth
 * field (customers.date_of_birth, DEC-041). The RISK-111 payroll bug was exactly this class of
 * mistake (a date computed via `.toISOString()` landing a day off in a UTC+ timezone), so the
 * boundary cases around a birthday and a year change are pinned explicitly rather than trusted
 * to "it looks right."
 */
import { describe, it, expect } from 'vitest';
import { calculateAge } from '@/lib/age';

describe('calculateAge', () => {
  it('returns null for no date of birth', () => {
    expect(calculateAge(null)).toBeNull();
    expect(calculateAge(undefined)).toBeNull();
    expect(calculateAge('')).toBeNull();
  });

  it('returns null for an unparseable string', () => {
    expect(calculateAge('not-a-date')).toBeNull();
  });

  it('counts a full year only after the birthday has occurred this year', () => {
    const now = new Date(2026, 9, 1); // 2026-10-01, local
    expect(calculateAge('2000-09-30', now)).toBe(26); // birthday already passed this year
    expect(calculateAge('2000-10-01', now)).toBe(26); // birthday is today
    expect(calculateAge('2000-10-02', now)).toBe(25); // birthday hasn't happened yet this year
  });

  it('handles a birthday exactly on a year boundary (Dec 31 -> Jan 1)', () => {
    const now = new Date(2026, 0, 1); // 2026-01-01, local
    expect(calculateAge('2025-12-31', now)).toBe(0);
    expect(calculateAge('2000-01-01', now)).toBe(26);
    expect(calculateAge('2000-01-02', now)).toBe(25);
  });

  it('never returns a negative age for a future date', () => {
    const now = new Date(2026, 0, 1);
    expect(calculateAge('2030-01-01', now)).toBeNull();
  });

  it('ignores a trailing time component (Supabase date columns come back as plain YYYY-MM-DD)', () => {
    const now = new Date(2026, 9, 1);
    expect(calculateAge('2000-10-01T00:00:00.000Z', now)).toBe(26);
  });
});
