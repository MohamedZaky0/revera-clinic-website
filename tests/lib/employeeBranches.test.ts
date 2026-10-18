/**
 * Pure rules behind multi-branch employees (DEC-110): what the Add / Edit Employee picker offers, how
 * ticking and "make primary" order the selection, which branches an edit pre-ticks, and how an
 * employee's assignment is read back from a possibly-legacy row.
 */
import { describe, it, expect } from 'vitest';
import {
  branchesOfferedFor,
  formatEmployeeBranchNames,
  getEmployeeBranchIds,
  isActiveBranch,
  makePrimaryBranch,
  readRequestedBranchIds,
  resolveEditBranchSelection,
  toggleBranchSelection,
  validateBranchSelection,
} from '@/lib/employeeBranches';

const BRANCHES = [
  { id: 'a', name_en: 'Alpha', name_ar: 'ألفا', status: 'active' },
  { id: 'b', name_en: 'Beta', name_ar: 'بيتا', status: 'active' },
  { id: 'x', name_en: 'Closed', name_ar: 'مغلق', status: 'inactive' },
];

describe('isActiveBranch', () => {
  it('is true only for status "active"', () => {
    expect(isActiveBranch({ id: 'a', status: 'active' })).toBe(true);
    expect(isActiveBranch({ id: 'x', status: 'inactive' })).toBe(false);
    expect(isActiveBranch({ id: 'x' })).toBe(false);
    expect(isActiveBranch(null)).toBe(false);
  });
});

describe('getEmployeeBranchIds', () => {
  it('puts branch_id first and de-duplicates', () => {
    expect(getEmployeeBranchIds({ branch_id: 'b', branch_ids: ['a', 'b', 'c'] })).toEqual(['b', 'a', 'c']);
  });
  it('falls back to branch_id for a legacy row with no branch_ids', () => {
    expect(getEmployeeBranchIds({ branch_id: 'a' })).toEqual(['a']);
    expect(getEmployeeBranchIds({ branch_id: 'a', branch_ids: [] })).toEqual(['a']);
  });
  it('still returns branch_ids when branch_id was nulled (branch deleted)', () => {
    expect(getEmployeeBranchIds({ branch_id: null, branch_ids: ['a'] })).toEqual(['a']);
  });
  it('is empty for no branches / no employee / garbage', () => {
    expect(getEmployeeBranchIds({ branch_id: null, branch_ids: [] })).toEqual([]);
    expect(getEmployeeBranchIds(null)).toEqual([]);
    expect(getEmployeeBranchIds({ branch_ids: 'nope' })).toEqual([]);
    expect(getEmployeeBranchIds({ branch_ids: [1, '', null, 'a'] })).toEqual(['a']);
  });
});

describe('readRequestedBranchIds', () => {
  it('reports nothing requested when neither field is present', () => {
    expect(readRequestedBranchIds({})).toEqual({ requested: false });
  });
  it('prefers branchIds over branchId', () => {
    expect(readRequestedBranchIds({ branchIds: ['a', 'b'], branchId: 'z' })).toEqual({ requested: true, raw: ['a', 'b'] });
  });
  it('treats a legacy branchId as a one-element list, and a falsy one as empty', () => {
    expect(readRequestedBranchIds({ branchId: 'a' })).toEqual({ requested: true, raw: ['a'] });
    expect(readRequestedBranchIds({ branchId: null })).toEqual({ requested: true, raw: [] });
    expect(readRequestedBranchIds({ branchId: '' })).toEqual({ requested: true, raw: [] });
  });
  it('treats a non-array branchIds as an (invalid) empty request', () => {
    expect(readRequestedBranchIds({ branchIds: 'a' })).toEqual({ requested: true, raw: [] });
  });
});

describe('validateBranchSelection', () => {
  it('accepts active branches and reports the first as primary', () => {
    expect(validateBranchSelection(['b', 'a'], BRANCHES)).toEqual({ ok: true, ids: ['b', 'a'], primary: 'b' });
  });
  it('rejects empty, duplicate, unknown and non-string entries', () => {
    expect(validateBranchSelection([], BRANCHES).ok).toBe(false);
    expect(validateBranchSelection(['a', 'a'], BRANCHES).ok).toBe(false);
    expect(validateBranchSelection(['nope'], BRANCHES).ok).toBe(false);
    expect(validateBranchSelection([' '], BRANCHES).ok).toBe(false);
    expect(validateBranchSelection([5 as any], BRANCHES).ok).toBe(false);
  });
  it('rejects a new inactive branch but keeps one the employee already has', () => {
    expect(validateBranchSelection(['a', 'x'], BRANCHES).ok).toBe(false);
    expect(validateBranchSelection(['a', 'x'], BRANCHES, ['x']).ok).toBe(true);
  });
});

describe('branchesOfferedFor (the picker list)', () => {
  it('offers only active branches when adding', () => {
    expect(branchesOfferedFor(BRANCHES).map((b) => b.id)).toEqual(['a', 'b']);
  });
  it('keeps an inactive branch the employee already holds, and no other inactive one', () => {
    expect(branchesOfferedFor(BRANCHES, ['x']).map((b) => b.id)).toEqual(['a', 'b', 'x']);
    expect(branchesOfferedFor(BRANCHES, ['a']).map((b) => b.id)).toEqual(['a', 'b']);
  });
});

describe('toggleBranchSelection / makePrimaryBranch', () => {
  it('ticking appends, so the first ticked branch stays primary', () => {
    expect(toggleBranchSelection(['a'], 'b')).toEqual(['a', 'b']);
  });
  it('unticking removes, which can leave the selection empty', () => {
    expect(toggleBranchSelection(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleBranchSelection(['a'], 'a')).toEqual([]);
  });
  it('make primary moves a ticked branch to the front', () => {
    expect(makePrimaryBranch(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
    expect(makePrimaryBranch(['a', 'b'], 'z')).toEqual(['a', 'b']);
  });
});

describe('resolveEditBranchSelection', () => {
  it('uses the employee assignment, primary first', () => {
    expect(resolveEditBranchSelection({ branch_id: 'b', branch_ids: ['a', 'b'] }, BRANCHES)).toEqual(['b', 'a']);
  });
  it('keeps an inactive branch the employee is on', () => {
    expect(resolveEditBranchSelection({ branch_id: 'x', branch_ids: ['x', 'a'] }, BRANCHES)).toEqual(['x', 'a']);
  });
  it('does not pre-tick anything for an employee with no branch (no silent default)', () => {
    expect(resolveEditBranchSelection({ branch_id: null, branch_ids: [] }, BRANCHES)).toEqual([]);
  });
  it('drops ids of branches that no longer exist', () => {
    expect(resolveEditBranchSelection({ branch_id: 'gone', branch_ids: ['gone', 'a'] }, BRANCHES)).toEqual(['a']);
  });
  it('merges a legacy doctor\'s extra provider branches into a single-branch employee, active ones only', () => {
    expect(resolveEditBranchSelection({ branch_id: 'a' }, BRANCHES, ['a', 'b', 'x'])).toEqual(['a', 'b']);
  });
  it('does not let provider data override an employee that already has several branches', () => {
    expect(resolveEditBranchSelection({ branch_id: 'a', branch_ids: ['a', 'b'] }, BRANCHES, ['a'])).toEqual(['a', 'b']);
  });
});

describe('formatEmployeeBranchNames', () => {
  const emp = { branch_id: 'b', branch_ids: ['b', 'a'] };
  it('lists names primary first in the active language', () => {
    expect(formatEmployeeBranchNames(emp, BRANCHES, 'en')).toBe('Beta, Alpha');
    expect(formatEmployeeBranchNames(emp, BRANCHES, 'ar')).toBe('بيتا، ألفا');
  });
  it('is empty when the employee has no known branch', () => {
    expect(formatEmployeeBranchNames({ branch_id: null }, BRANCHES)).toBe('');
  });
});
