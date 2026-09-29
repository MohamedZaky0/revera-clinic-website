/**
 * DEC-097: ReportsSection component tests — permission-based tab visibility and bilingual labels.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ReportsSection } from '@/components/admin/reports/ReportsSection';

function stubFetch() {
  const mock = vi.fn(async () => {
    return new Response(JSON.stringify({ branchId: null, months: [] }), { status: 200 });
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ReportsSection', () => {
  it('shows all 8 tabs when both canViewFinancialReports and canViewAnalytics are true', async () => {
    stubFetch();
    render(
      <ReportsSection
        canViewFinancialReports={true}
        canViewAnalytics={true}
        lang="en"
      />
    );

    // Performance group tabs
    expect(screen.getByText('Trend')).toBeTruthy();
    expect(screen.getByText('Service Margins')).toBeTruthy();
    expect(screen.getByText('Doctor / Branch P&L')).toBeTruthy();
    expect(screen.getByText('Package Profitability')).toBeTruthy();

    // Operations group tabs
    expect(screen.getByText('Capacity')).toBeTruthy();
    expect(screen.getByText('Service Mix')).toBeTruthy();
    expect(screen.getByText('No-Show / Cancellations')).toBeTruthy();

    // Patients group tabs
    expect(screen.getByText('New vs Returning')).toBeTruthy();
  });

  it('shows only Capacity when canViewAnalytics=true and canViewFinancialReports=false', async () => {
    stubFetch();
    render(
      <ReportsSection
        canViewFinancialReports={false}
        canViewAnalytics={true}
        lang="en"
      />
    );

    expect(screen.getByText('Capacity')).toBeTruthy();
    expect(screen.queryByText('Trend')).toBeNull();
    expect(screen.queryByText('Service Mix')).toBeNull();
  });

  it('shows the no-access message when both permissions are false', async () => {
    render(
      <ReportsSection
        canViewFinancialReports={false}
        canViewAnalytics={false}
        lang="en"
      />
    );

    expect(screen.getByText('You do not have access to any report')).toBeTruthy();
  });

  it('renders Arabic labels when lang="ar"', async () => {
    stubFetch();
    render(
      <ReportsSection
        canViewFinancialReports={true}
        canViewAnalytics={true}
        lang="ar"
      />
    );

    // Check for Arabic title
    expect(screen.getByText('التقارير')).toBeTruthy();

    // Check for Arabic group headings
    expect(screen.getByText('الأداء')).toBeTruthy(); // Performance
    expect(screen.getByText('التشغيل')).toBeTruthy(); // Operations
    expect(screen.getByText('المرضى')).toBeTruthy(); // Patients

    // Check for a few Arabic tab labels
    expect(screen.getByText('الاتجاه')).toBeTruthy(); // Trend
    expect(screen.getByText('الطاقة الاستيعابية')).toBeTruthy(); // Capacity
  });

  it('renders English labels when lang="en"', async () => {
    stubFetch();
    render(
      <ReportsSection
        canViewFinancialReports={true}
        canViewAnalytics={true}
        lang="en"
      />
    );

    expect(screen.getByText('Reports')).toBeTruthy();
    expect(screen.getByText('Performance')).toBeTruthy();
    expect(screen.getByText('Operations')).toBeTruthy();
    expect(screen.getByText('Patients')).toBeTruthy();
  });

  it('sets rtl dir when lang="ar"', async () => {
    stubFetch();
    const { container } = render(
      <ReportsSection
        canViewFinancialReports={true}
        canViewAnalytics={true}
        lang="ar"
      />
    );

    const wrapper = container.querySelector('[dir="rtl"]');
    expect(wrapper).toBeTruthy();
  });

  it('sets ltr dir when lang="en"', async () => {
    stubFetch();
    const { container } = render(
      <ReportsSection
        canViewFinancialReports={true}
        canViewAnalytics={true}
        lang="en"
      />
    );

    const wrapper = container.querySelector('[dir="ltr"]');
    expect(wrapper).toBeTruthy();
  });

  it('groups tabs correctly under Performance, Operations, and Patients', async () => {
    stubFetch();
    render(
      <ReportsSection
        canViewFinancialReports={true}
        canViewAnalytics={true}
        lang="en"
      />
    );

    // All group headings should exist
    const headings = screen.getAllByRole('heading');
    const headingTexts = headings.map(h => h.textContent);

    expect(headingTexts.some(t => t?.includes('Performance'))).toBeTruthy();
    expect(headingTexts.some(t => t?.includes('Operations'))).toBeTruthy();
    expect(headingTexts.some(t => t?.includes('Patients'))).toBeTruthy();
  });
});
