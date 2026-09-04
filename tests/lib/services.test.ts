import { describe, it, expect } from 'vitest';
import {
  getServiceDurationMinutes,
  getDurationInMinutes,
  getEffectiveServicePrice,
  getSessionStaleness,
  normaliseTo24hSlot,
  STALE_SESSION_THRESHOLD_MS,
} from '@/lib/services';

describe('getServiceDurationMinutes', () => {
  it('prefers duration_minutes when present', () => {
    expect(getServiceDurationMinutes({ duration_minutes: 45, duration: '30 mins' })).toBe(45);
  });

  it('falls back to parsing duration when duration_minutes is null/absent', () => {
    expect(getServiceDurationMinutes({ duration: '1:00 Hours' })).toBe(60);
    expect(getServiceDurationMinutes({ duration: '30 mins' })).toBe(30);
  });

  it('returns 30 when nothing is available', () => {
    expect(getServiceDurationMinutes(null)).toBe(30);
    expect(getServiceDurationMinutes({})).toBe(30);
    expect(getServiceDurationMinutes({ duration: null, duration_minutes: null })).toBe(30);
  });

  it('ignores duration_minutes <= 0 and falls back', () => {
    expect(getServiceDurationMinutes({ duration_minutes: 0, duration: '45 mins' })).toBe(45);
    expect(getServiceDurationMinutes({ duration_minutes: -10, duration: '45 mins' })).toBe(45);
  });
});

describe('getDurationInMinutes', () => {
  it('parses "H:MM Hours" format', () => {
    expect(getDurationInMinutes('1:30 Hours')).toBe(90);
    expect(getDurationInMinutes('0:30 Hours')).toBe(30);
  });

  it('parses "N mins" format', () => {
    expect(getDurationInMinutes('30 mins')).toBe(30);
    expect(getDurationInMinutes('15 mins')).toBe(15);
  });

  it('parses "N hour" format', () => {
    expect(getDurationInMinutes('1 hour')).toBe(60);
    expect(getDurationInMinutes('2 hours')).toBe(120);
  });

  it('parses "H:MM" format without unit', () => {
    expect(getDurationInMinutes('1:30')).toBe(90);
  });

  it('returns 30 for unparseable input', () => {
    expect(getDurationInMinutes('45')).toBe(30);
    expect(getDurationInMinutes('1 hr')).toBe(30);
    expect(getDurationInMinutes(null)).toBe(30);
    expect(getDurationInMinutes('')).toBe(30);
  });
});

describe('getEffectiveServicePrice', () => {
  it('returns 0 for null service', () => {
    expect(getEffectiveServicePrice(null)).toBe(0);
  });

  it('returns base price when no branch pricing', () => {
    expect(getEffectiveServicePrice({ price: 200 })).toBe(200);
  });

  it('branch-specific pricing wins over base price', () => {
    const service = {
      price: 200,
      branchPricing: [
        { name: 'Nasr City', price: 250, visible: true, status: true },
        { name: 'Maadi', price: 180, visible: true, status: true, isDefault: true },
      ],
    };
    expect(getEffectiveServicePrice(service, 'Nasr City')).toBe(250);
  });

  it('falls back to default branch when no match', () => {
    const service = {
      price: 200,
      branchPricing: [
        { name: 'Nasr City', price: 250, visible: true, status: true },
        { name: 'Maadi', price: 180, visible: true, status: true, isDefault: true },
      ],
    };
    expect(getEffectiveServicePrice(service, 'Zamalek')).toBe(180);
  });

  it('falls back to base price when no branchPricing at all', () => {
    expect(getEffectiveServicePrice({ price: 300 }, 'Nasr City')).toBe(300);
  });
});

describe('getSessionStaleness', () => {
  const now = new Date('2026-08-17T12:00:00Z');

  it('completed booking is never stale regardless of age', () => {
    const oldStarted = '2026-08-10T08:00:00Z';
    const result = getSessionStaleness('completed', oldStarted, '2026-08-10', undefined, now);
    expect(result.isStale).toBe(false);
  });

  it('cancelled booking is never stale', () => {
    const oldStarted = '2026-08-10T08:00:00Z';
    const result = getSessionStaleness('cancelled', oldStarted, '2026-08-10', undefined, now);
    expect(result.isStale).toBe(false);
  });

  it('started session under threshold → not stale', () => {
    const recentStarted = '2026-08-17T11:00:00Z'; // 1h ago
    const result = getSessionStaleness('started', recentStarted, '2026-08-17', 2 * 60 * 60 * 1000, now);
    expect(result.isStale).toBe(false);
  });

  it('started session over threshold → stale', () => {
    const oldStarted = '2026-08-17T08:00:00Z'; // 4h ago
    const result = getSessionStaleness('started', oldStarted, '2026-08-17', 2 * 60 * 60 * 1000, now);
    expect(result.isStale).toBe(true);
    expect(result.elapsedMs).toBe(4 * 60 * 60 * 1000);
    expect(result.elapsedLabel).toBe('4h');
  });

  it('null started_at with past booking date → stale, elapsedMs null, elapsedLabel null', () => {
    const result = getSessionStaleness('started', null, '2026-08-10', undefined, now);
    expect(result.isStale).toBe(true);
    expect(result.elapsedMs).toBe(null);
    expect(result.elapsedLabel).toBe(null);
  });

  it('null started_at with today booking date → not stale', () => {
    const result = getSessionStaleness('started', null, '2026-08-17', undefined, now);
    expect(result.isStale).toBe(false);
  });

  it('in_progress status is treated same as started', () => {
    const oldStarted = '2026-08-17T08:00:00Z';
    const result = getSessionStaleness('in_progress', oldStarted, '2026-08-17', 2 * 60 * 60 * 1000, now);
    expect(result.isStale).toBe(true);
  });

  it('default threshold is STALE_SESSION_THRESHOLD_MS (2 hours)', () => {
    expect(STALE_SESSION_THRESHOLD_MS).toBe(2 * 60 * 60 * 1000);
  });

  it('custom threshold: 1h → not stale at 30m, stale at 2h', () => {
    const started30mAgo = '2026-08-17T11:30:00Z';
    const started2hAgo = '2026-08-17T10:00:00Z';
    const threshold1h = 1 * 60 * 60 * 1000;
    expect(getSessionStaleness('started', started30mAgo, '2026-08-17', threshold1h, now).isStale).toBe(false);
    expect(getSessionStaleness('started', started2hAgo, '2026-08-17', threshold1h, now).isStale).toBe(true);
  });

  it('elapsedLabel formats days correctly', () => {
    const twoDaysAgo = '2026-08-15T12:00:00Z';
    const result = getSessionStaleness('started', twoDaysAgo, '2026-08-15', 1000, now);
    expect(result.isStale).toBe(true);
    expect(result.elapsedLabel).toBe('2d');
  });

  it('elapsedLabel formats minutes correctly', () => {
    const fiveMinAgo = '2026-08-17T11:55:00Z';
    const result = getSessionStaleness('started', fiveMinAgo, '2026-08-17', 1000, now);
    expect(result.isStale).toBe(true);
    expect(result.elapsedLabel).toBe('5m');
  });
});

describe('normaliseTo24hSlot', () => {
  it('parses 24h format', () => {
    expect(normaliseTo24hSlot('14:30')).toBe('14:30');
    expect(normaliseTo24hSlot('09:00')).toBe('09:00');
  });

  it('parses AM/PM format', () => {
    expect(normaliseTo24hSlot('2:30 PM')).toBe('14:30');
    expect(normaliseTo24hSlot('10:00 AM')).toBe('10:00');
    expect(normaliseTo24hSlot('12:00 PM')).toBe('12:00');
    expect(normaliseTo24hSlot('12:00 AM')).toBe('00:00');
  });

  it('rounds to nearest 15 minutes', () => {
    expect(normaliseTo24hSlot('14:07')).toBe('14:00');
    expect(normaliseTo24hSlot('14:08')).toBe('14:15');
    expect(normaliseTo24hSlot('14:22')).toBe('14:15');
    expect(normaliseTo24hSlot('14:23')).toBe('14:30');
  });

  it('returns null for invalid input', () => {
    expect(normaliseTo24hSlot(null)).toBe(null);
    expect(normaliseTo24hSlot('')).toBe(null);
    expect(normaliseTo24hSlot('invalid')).toBe(null);
  });
});
