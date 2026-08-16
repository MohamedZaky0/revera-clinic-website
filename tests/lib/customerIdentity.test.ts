import { describe, it, expect } from 'vitest';
import { normalizeEgyptMobile, isOwnIdentity } from '@/lib/customerIdentity';

describe('normalizeEgyptMobile', () => {
  it('converts +20 prefix to 0', () => {
    expect(normalizeEgyptMobile('+201035595691')).toBe('01035595691');
  });

  it('converts 20 prefix (length > 10) to 0', () => {
    expect(normalizeEgyptMobile('201035595691')).toBe('01035595691');
  });

  it('keeps 0-prefix as-is', () => {
    expect(normalizeEgyptMobile('01035595691')).toBe('01035595691');
  });

  it('returns empty string for null/undefined', () => {
    expect(normalizeEgyptMobile(null)).toBe('');
    expect(normalizeEgyptMobile(undefined)).toBe('');
  });

  it('trims whitespace', () => {
    expect(normalizeEgyptMobile('  01035595691  ')).toBe('01035595691');
  });

  it('all three formats compare equal', () => {
    const a = normalizeEgyptMobile('+201035595691');
    const b = normalizeEgyptMobile('201035595691');
    const c = normalizeEgyptMobile('01035595691');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

describe('isOwnIdentity', () => {
  it('returns false for null customer', () => {
    expect(isOwnIdentity({ id: 'user-1', phone: '01035595691' }, null)).toBe(false);
  });

  it('auth_user_id takes precedence when present', () => {
    expect(
      isOwnIdentity(
        { id: 'user-1', phone: '01000000000', email: 'wrong@example.com' },
        { auth_user_id: 'user-1', mobile: '01999999999', email: 'other@example.com' }
      )
    ).toBe(true);
  });

  it('auth_user_id mismatch returns false even if phone matches', () => {
    expect(
      isOwnIdentity(
        { id: 'user-1', phone: '01035595691' },
        { auth_user_id: 'user-2', mobile: '01035595691' }
      )
    ).toBe(false);
  });

  it('phone match works when no auth_user_id', () => {
    expect(
      isOwnIdentity(
        { id: 'user-1', phone: '+201035595691' },
        { mobile: '01035595691' }
      )
    ).toBe(true);
  });

  it('email match is case-insensitive', () => {
    expect(
      isOwnIdentity(
        { id: 'user-1', email: 'Test@Example.COM' },
        { email: 'test@example.com' }
      )
    ).toBe(true);
  });

  it('non-matching phone returns false (never a false positive)', () => {
    expect(
      isOwnIdentity(
        { id: 'user-1', phone: '01035595691' },
        { mobile: '01222222222' }
      )
    ).toBe(false);
  });

  it('non-matching email returns false', () => {
    expect(
      isOwnIdentity(
        { id: 'user-1', email: 'a@example.com' },
        { email: 'b@example.com' }
      )
    ).toBe(false);
  });

  it('empty customer (no auth_user_id, no mobile, no email) returns false', () => {
    expect(
      isOwnIdentity({ id: 'user-1', phone: '01035595691' }, {})
    ).toBe(false);
  });
});
