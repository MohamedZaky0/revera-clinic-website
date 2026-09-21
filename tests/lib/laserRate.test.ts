import { describe, expect, it } from 'vitest';
import { resolveLaserPulseRate } from '@/lib/laserRate';

describe('resolveLaserPulseRate', () => {
  it('prefers the reservation snapshot', () => {
    expect(resolveLaserPulseRate({ reservationRate: 7, clinicDefaultRate: 5, notes: '@ 3 EGP/pulse' })).toBe(7);
  });

  it('uses the clinic booking default when the snapshot is absent', () => {
    expect(resolveLaserPulseRate({ reservationRate: null, clinicDefaultRate: 5, notes: '@ 3 EGP/pulse' })).toBe(5);
  });

  it('uses notes only for a legacy booking with no configured rate', () => {
    expect(resolveLaserPulseRate({ reservationRate: null, clinicDefaultRate: null, notes: 'Legacy @ 3 EGP/pulse' })).toBe(3);
  });

  it('returns null instead of fabricating a rate', () => {
    expect(resolveLaserPulseRate({ reservationRate: 0, clinicDefaultRate: 0, notes: '' })).toBeNull();
    expect(resolveLaserPulseRate({ reservationRate: -1, clinicDefaultRate: Number.NaN, notes: '@ 0 EGP/pulse' })).toBeNull();
  });
});
