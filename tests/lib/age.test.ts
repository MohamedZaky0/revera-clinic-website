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

import { ageFieldsForSave } from '@/lib/age';

describe('ageFieldsForSave (New Booking new-patient intake, DEC-041)', () => {
  it('a birth date wins: it is sent and the typed age is dropped', () => {
    expect(ageFieldsForSave('1995-05-15', '31')).toEqual({ age: null, date_of_birth: '1995-05-15' });
  });

  it('without a birth date the typed age is kept as a number', () => {
    expect(ageFieldsForSave('', '28')).toEqual({ age: 28, date_of_birth: null });
    expect(ageFieldsForSave(null, ' 28 ')).toEqual({ age: 28, date_of_birth: null });
  });

  it('neither given sends nothing', () => {
    expect(ageFieldsForSave('', '')).toEqual({ age: null, date_of_birth: null });
    expect(ageFieldsForSave(undefined, undefined)).toEqual({ age: null, date_of_birth: null });
  });

  it('a non-numeric age is not sent as NaN', () => {
    expect(ageFieldsForSave('', 'abc')).toEqual({ age: null, date_of_birth: null });
  });

  it('an age of 0 (an infant) is a real value, not "missing"', () => {
    expect(ageFieldsForSave('', '0')).toEqual({ age: 0, date_of_birth: null });
  });
});
