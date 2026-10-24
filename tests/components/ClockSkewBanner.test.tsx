import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClockSkewBanner from '@/components/admin/ClockSkewBanner';

describe('ClockSkewBanner (RISK-130)', () => {
  it('shows nothing while the gap is unknown or small', () => {
    const { container, rerender } = render(<ClockSkewBanner skewMs={null} lang="en" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ClockSkewBanner skewMs={30_000} lang="en" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says the clock is ahead, by how much, and what to do', () => {
    render(<ClockSkewBanner skewMs={3600_000 + 2 * 60_000} lang="en" />);
    const banner = screen.getByTestId('clock-skew-banner');
    expect(banner).toHaveTextContent('about 1 hour 2 min ahead of the real time');
    expect(banner).toHaveTextContent('Set time automatically');
    expect(banner).toHaveTextContent('do not set the time by hand');
  });

  it('says behind for a clock that is late, with plural hours', () => {
    render(<ClockSkewBanner skewMs={-(2 * 3600_000)} lang="en" />);
    expect(screen.getByTestId('clock-skew-banner')).toHaveTextContent('about 2 hours behind the real time');
  });

  it('reads in Arabic, right to left', () => {
    render(<ClockSkewBanner skewMs={3600_000} lang="ar" />);
    const banner = screen.getByTestId('clock-skew-banner');
    expect(banner).toHaveAttribute('dir', 'rtl');
    expect(banner).toHaveTextContent('متقدمة');
    expect(banner).toHaveTextContent('1 ساعة');
  });
});
