import { describe, it, expect } from 'vitest';
import { prescriptionsForBooking, pickPrescriptionForBooking } from '@/lib/prescriptionBooking';

const A = 'a0000000-0000-0000-0000-00000000000a';
const B = 'b0000000-0000-0000-0000-00000000000b';

describe('prescriptionsForBooking / pickPrescriptionForBooking (DEC-140)', () => {
  it('drops a prescription linked to another booking', () => {
    const list = [{ id: 'rx-A', booking_id: A }];
    expect(prescriptionsForBooking(list, B)).toEqual([]);
    expect(pickPrescriptionForBooking(list, B)).toBeNull();
  });

  it('keeps the booking\'s own and unlinked prescriptions, preferring its own', () => {
    const list = [
      { id: 'rx-orphan', booking_id: null },
      { id: 'rx-B', booking_id: B },
      { id: 'rx-A', booking_id: A },
    ];
    expect(prescriptionsForBooking(list, B).map((r) => r.id)).toEqual(['rx-orphan', 'rx-B']);
    expect(pickPrescriptionForBooking(list, B)?.id).toBe('rx-B');
  });

  it('falls back to an unlinked prescription when the booking has none of its own', () => {
    const list = [{ id: 'rx-A', booking_id: A }, { id: 'rx-orphan' }];
    expect(pickPrescriptionForBooking(list, B)?.id).toBe('rx-orphan');
  });

  it('handles empty / invalid input', () => {
    expect(prescriptionsForBooking(undefined, B)).toEqual([]);
    expect(pickPrescriptionForBooking(null, B)).toBeNull();
  });
});
