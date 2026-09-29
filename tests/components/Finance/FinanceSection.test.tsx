/**
 * DEC-097: FinanceSection component tests — verify moved tabs are not present, remaining 8 tabs are.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinanceSection } from '@/components/admin/Finance/FinanceSection';

function stubFetch() {
  const mock = vi.fn(async () => {
    return new Response(JSON.stringify({}), { status: 200 });
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('FinanceSection', () => {
  it('shows the 8 remaining tabs (not the moved ones)', async () => {
    stubFetch();
    render(<FinanceSection lang="en" />);

    // Remaining tabs that should be present
    expect(screen.getByText('Expenses')).toBeTruthy();
    expect(screen.getByText('Assets & Depreciation')).toBeTruthy();
    expect(screen.getByText('Loans')).toBeTruthy();
    expect(screen.getByText('P&L')).toBeTruthy();
    expect(screen.getByText('Cash Flow')).toBeTruthy();
    expect(screen.getByText('Receivables Aging')).toBeTruthy();
    expect(screen.getByText('Commission Payouts')).toBeTruthy();
  });

  it('does not show the 8 moved tabs', async () => {
    stubFetch();
    render(<FinanceSection lang="en" />);

    // Moved tabs that should NOT be present
    expect(screen.queryByText('Trend')).toBeNull();
    expect(screen.queryByText('Service Margins')).toBeNull();
    expect(screen.queryByText('Doctor / Branch P&L')).toBeNull();
    expect(screen.queryByText('Package Profitability')).toBeNull();
    expect(screen.queryByText('Capacity')).toBeNull();
    expect(screen.queryByText('Service Mix')).toBeNull();
    expect(screen.queryByText('No-Show')).toBeNull();
    expect(screen.queryByText('New vs Returning')).toBeNull();
  });

  it('does not show Budget vs Actual (hidden, not deleted)', async () => {
    stubFetch();
    render(<FinanceSection lang="en" />);

    expect(screen.queryByText('Budget vs Actual')).toBeNull();
  });

  it('shows group headings for Overview, Records, and Statements', async () => {
    stubFetch();
    render(<FinanceSection lang="en" />);

    const headings = screen.getAllByRole('heading');
    const headingTexts = headings.map(h => h.textContent);
    
    expect(headingTexts.some(t => t?.includes('Overview'))).toBeTruthy();
    expect(headingTexts.some(t => t?.includes('Records'))).toBeTruthy();
    expect(headingTexts.some(t => t?.includes('Statements'))).toBeTruthy();
  });

  it('renders English labels when lang="en"', async () => {
    stubFetch();
    render(<FinanceSection lang="en" />);

    expect(screen.getByText('Finance')).toBeTruthy();
  });

  it('sets rtl dir when lang="ar"', async () => {
    stubFetch();
    const { container } = render(<FinanceSection lang="ar" />);

    const wrapper = container.querySelector('[dir="rtl"]');
    expect(wrapper).toBeTruthy();
  });

  it('sets ltr dir when lang="en"', async () => {
    stubFetch();
    const { container } = render(<FinanceSection lang="en" />);

    const wrapper = container.querySelector('[dir="ltr"]');
    expect(wrapper).toBeTruthy();
  });
});
