/**
 * jsdom tests for ReportsAnalyticsView. This screen used to hardcode fake "Top Performing Services"
 * and "Doctor Utilization" tables (fictional doctor names, service names and growth/occupancy
 * percentages) and two fabricated "+18.2%" / "+12.4%" deltas on the KPI cards — a clinic owner had
 * no way to tell they weren't real. Everything shown now comes from the `allReservations` /
 * `providers` / `localServices` props, or is an honest empty state; nothing is invented.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import ReportsAnalyticsView from '@/components/admin/reports/ReportsAnalyticsView';

const SERVICES = [
  { id: 1, en: 'Laser Face', ar: 'ليزر وجه' },
  { id: 2, en: 'HydraFacial', ar: 'هيدرافيشل' },
];
const PROVIDERS = [{ id: 'p1', name: 'Dr. Real Doctor', specialty: 'Dermatology' }];

function completed(over: Record<string, any> = {}) {
  return { status: 'completed', amountPaid: 1000, serviceId: 1, doctorName: 'Dr. Real Doctor', ...over };
}

describe('ReportsAnalyticsView', () => {
  it('never renders any of the old fabricated names, percentages or claims', () => {
    render(
      <ReportsAnalyticsView
        allReservations={[completed(), completed({ serviceId: 2, amountPaid: 500 })]}
        providers={PROVIDERS}
        localServices={SERVICES}
        branches={[]}
      />
    );
    const text = document.body.textContent || '';
    for (const fake of [
      'Dr. Sara El Gamel', 'Dr. Ahmed Mansour', 'Dr. Nouran Tarek',
      'Full Body Laser Hair Removal', 'HydraFacial Deep Cleansing', 'Skin Booster & Mesotherapy',
      'Fractional CO2 Laser Resurfacing',
      '+18.2%', '+12.4%', '+14%', '+22%', '+8%', '+18%',
      '96%', '88%', '92%',
      'Full schedule availability',
    ]) {
      expect(text).not.toContain(fake);
    }
  });

  it('computes Top Performing Services from real completed reservations, ranked by revenue', () => {
    render(
      <ReportsAnalyticsView
        allReservations={[
          completed({ serviceId: 1, amountPaid: 400 }),
          completed({ serviceId: 1, amountPaid: 600 }),
          completed({ serviceId: 2, amountPaid: 100 }),
          { status: 'pending', serviceId: 1, amountPaid: 9999 }, // not completed — must be excluded
        ]}
        providers={PROVIDERS}
        localServices={SERVICES}
      />
    );
    expect(screen.getByText('Laser Face')).toBeTruthy();
    expect(screen.getByText('1,000 EGP')).toBeTruthy(); // 400 + 600
    expect(screen.getByText('2 sessions completed')).toBeTruthy();
    expect(screen.getByText('HydraFacial')).toBeTruthy();
    expect(screen.getByText('100 EGP')).toBeTruthy();
  });

  it('computes Doctor Utilization from real completed reservations, with no invented specialty or rate', () => {
    render(
      <ReportsAnalyticsView
        allReservations={[completed({ amountPaid: 700 }), completed({ amountPaid: 300 })]}
        providers={PROVIDERS}
        localServices={SERVICES}
      />
    );
    expect(screen.getByText('Dr. Real Doctor')).toBeTruthy();
    expect(screen.getByText(/Dermatology/)).toBeTruthy();
    // sum of amountPaid for this doctor's completed reservations, not a fabricated total
    expect(screen.getAllByText('1,000 EGP').length).toBeGreaterThan(0);
  });

  it('a doctor with no matching provider record still shows (name from the reservation, no specialty line)', () => {
    render(
      <ReportsAnalyticsView
        allReservations={[completed({ doctorName: 'Dr. Unlisted', amountPaid: 200 })]}
        providers={[]}
        localServices={SERVICES}
      />
    );
    expect(screen.getByText('Dr. Unlisted')).toBeTruthy();
  });

  it('an unrecognised serviceId falls back to "Service #<id>", never a blank or fabricated name', () => {
    render(
      <ReportsAnalyticsView
        allReservations={[completed({ serviceId: 999, amountPaid: 50 })]}
        providers={PROVIDERS}
        localServices={SERVICES}
      />
    );
    expect(screen.getByText('Service #999')).toBeTruthy();
  });

  it('with no completed reservations, shows an honest empty state instead of an empty or fake list', () => {
    render(<ReportsAnalyticsView allReservations={[]} providers={PROVIDERS} localServices={SERVICES} />);
    expect(screen.getByText('No completed bookings to show yet.')).toBeTruthy();
    expect(screen.getByText('No completed sessions to show yet.')).toBeTruthy();
    expect(screen.getByText('0 with completed sessions on record')).toBeTruthy();
  });

  it('KPI totals are the real sums, not a fabricated delta', () => {
    render(
      <ReportsAnalyticsView
        allReservations={[completed({ amountPaid: 400 }), { status: 'pending', amountPaid: 999 }]}
        providers={PROVIDERS}
        localServices={SERVICES}
      />
    );
    expect(screen.getByText('2')).toBeTruthy(); // totalVisits
    expect(screen.getAllByText((_, el) => el?.textContent === '400 EGP').length).toBeGreaterThan(0);
  });

  it('renders the Arabic copy with no fabricated numbers there either', () => {
    render(<ReportsAnalyticsView lang="ar" allReservations={[]} providers={[]} localServices={[]} />);
    const text = document.body.textContent || '';
    expect(text).not.toContain('+18.2%');
    expect(text).not.toContain('+12.4%');
    expect(text).toContain('لا توجد حجوزات مكتملة لعرضها بعد.');
  });
});
