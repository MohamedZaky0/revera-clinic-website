import { describe, it, expect } from 'vitest';
import { clockSkewMs, isClockSkewed, splitSkew } from '@/lib/clockSkew';

const SERVER = 'Sat, 24 Oct 2026 18:38:00 GMT';
const SERVER_MS = Date.parse(SERVER);

describe('clockSkewMs (RISK-130)', () => {
  it('is positive when this computer is ahead, negative when behind, zero when level', () => {
    expect(clockSkewMs(SERVER, SERVER_MS + 3600_000)).toBe(3600_000);
    expect(clockSkewMs(SERVER, SERVER_MS - 90_000)).toBe(-90_000);
    expect(clockSkewMs(SERVER, SERVER_MS)).toBe(0);
  });

  it('is null when the header is missing or unreadable', () => {
    expect(clockSkewMs(null, SERVER_MS)).toBeNull();
    expect(clockSkewMs(undefined, SERVER_MS)).toBeNull();
    expect(clockSkewMs('', SERVER_MS)).toBeNull();
    expect(clockSkewMs('not a date', SERVER_MS)).toBeNull();
  });
});

describe('isClockSkewed', () => {
  it('ignores normal network delay and flags a real gap in either direction', () => {
    expect(isClockSkewed(2_000)).toBe(false);
    expect(isClockSkewed(-4 * 60_000)).toBe(false);
    expect(isClockSkewed(5 * 60_000)).toBe(true);
    expect(isClockSkewed(3600_000)).toBe(true);
    expect(isClockSkewed(-3600_000)).toBe(true);
  });

  it('unknown is not a problem', () => {
    expect(isClockSkewed(null)).toBe(false);
    expect(isClockSkewed(undefined)).toBe(false);
    expect(isClockSkewed(Number.NaN)).toBe(false);
  });
});

describe('splitSkew', () => {
  it('splits into hours and minutes and says which way', () => {
    expect(splitSkew(3600_000 + 60_000)).toEqual({ hours: 1, minutes: 1, ahead: true });
    expect(splitSkew(-(37 * 60_000))).toEqual({ hours: 0, minutes: 37, ahead: false });
    expect(splitSkew(2 * 3600_000)).toEqual({ hours: 2, minutes: 0, ahead: true });
  });
});
