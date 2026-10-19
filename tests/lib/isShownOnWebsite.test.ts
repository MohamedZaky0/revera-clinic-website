import { describe, it, expect } from 'vitest';
import { isShownOnWebsite } from '@/lib/services';

describe('isShownOnWebsite (DEC-111)', () => {
  it('a plain service (no flags) is shown', () => {
    expect(isShownOnWebsite({})).toBe(true);
  });

  it('is hidden when marked system-only, even though it is active and visible', () => {
    expect(isShownOnWebsite({ active: true, visible: true, showOnWebsite: false })).toBe(false);
  });

  it('keeps the existing rules: inactive or not visible (soft-deleted) is still hidden', () => {
    expect(isShownOnWebsite({ active: false })).toBe(false);
    expect(isShownOnWebsite({ visible: false })).toBe(false);
    expect(isShownOnWebsite({ active: false, visible: false, showOnWebsite: true })).toBe(false);
  });

  it('an explicit true is shown', () => {
    expect(isShownOnWebsite({ active: true, visible: true, showOnWebsite: true })).toBe(true);
  });
});
