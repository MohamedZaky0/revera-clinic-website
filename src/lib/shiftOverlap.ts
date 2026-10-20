/**
 * A doctor's weekly schedule has two kinds of shift per branch: In-Clinic and Online Consultations.
 * Overlap warnings on the doctor form exist to catch a doctor booked in two places at once, but an
 * online consultation can run while the doctor is also available in the clinic at the same branch,
 * so that one pair is allowed to overlap (owner decision, 2026-10-21). Two in-clinic shifts, two
 * online shifts, or any shifts at different branches that overlap still warn.
 */
export type ShiftKind = 'in_clinic' | 'online';

export interface ShiftSlot {
  branchId: string;
  kind: ShiftKind;
}

export function mayOverlap(a: ShiftSlot, b: ShiftSlot): boolean {
  return a.branchId === b.branchId && a.kind !== b.kind;
}
