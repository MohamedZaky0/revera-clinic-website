import { describe, it, expect } from 'vitest';
import { parseSection, withSection } from '@/lib/adminSection';

describe('parseSection', () => {
  it('reads a known section from the query string', () => {
    expect(parseSection('?section=Patients')).toBe('Patients');
    expect(parseSection('?section=Terms%20%26%20Conditions')).toBe('Terms & Conditions');
  });

  it('ignores unknown, action-only or missing values', () => {
    expect(parseSection('')).toBeNull();
    expect(parseSection('?section=Logout')).toBeNull();
    expect(parseSection('?section=New%20Booking')).toBeNull();
    expect(parseSection('?section=<script>')).toBeNull();
  });
});

describe('withSection', () => {
  it('sets the section and keeps other parameters', () => {
    expect(withSection('?setup=true', 'Finance')).toBe('?setup=true&section=Finance');
  });

  it('replaces an existing section', () => {
    expect(withSection('?section=Patients', 'Bookings')).toBe('?section=Bookings');
  });

  it('drops the parameter for the default section, leaving the URL clean', () => {
    expect(withSection('?section=Patients', 'Dashboard')).toBe('');
    expect(withSection('?recovery=true&section=Patients', 'Dashboard')).toBe('?recovery=true');
  });

  it('never writes an unknown label into the URL', () => {
    expect(withSection('', 'Logout')).toBe('');
  });

  it('round-trips through parseSection', () => {
    expect(parseSection(withSection('', 'Terms & Conditions'))).toBe('Terms & Conditions');
  });
});
