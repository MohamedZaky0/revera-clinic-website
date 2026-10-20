import { describe, it, expect } from 'vitest';
import { mayOverlap } from '@/lib/shiftOverlap';

describe('mayOverlap - doctor schedule overlap warning', () => {
  it('lets In-Clinic and Online Consultations overlap at the same branch', () => {
    expect(mayOverlap({ branchId: 'a', kind: 'in_clinic' }, { branchId: 'a', kind: 'online' })).toBe(true);
    expect(mayOverlap({ branchId: 'a', kind: 'online' }, { branchId: 'a', kind: 'in_clinic' })).toBe(true);
  });

  it('still flags two in-clinic shifts at the same branch', () => {
    expect(mayOverlap({ branchId: 'a', kind: 'in_clinic' }, { branchId: 'a', kind: 'in_clinic' })).toBe(false);
  });

  it('still flags two online shifts at the same branch', () => {
    expect(mayOverlap({ branchId: 'a', kind: 'online' }, { branchId: 'a', kind: 'online' })).toBe(false);
  });

  it('still flags overlapping shifts at different branches, whatever the kind', () => {
    expect(mayOverlap({ branchId: 'a', kind: 'in_clinic' }, { branchId: 'b', kind: 'in_clinic' })).toBe(false);
    expect(mayOverlap({ branchId: 'a', kind: 'in_clinic' }, { branchId: 'b', kind: 'online' })).toBe(false);
  });
});
