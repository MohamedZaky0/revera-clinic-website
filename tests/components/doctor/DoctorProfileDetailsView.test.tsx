/**
 * Doctor profile — visit history, schedule and CSV export. No money math lives here directly, but
 * this is the doctor-facing read of the same `reservations` data the booking/checkout flows write
 * (module 3 of ai_docs/TEST_COVERAGE_INVENTORY.md): a wrong doctor-match or a wrong date-range
 * boundary here means a doctor sees another doctor's patients, or misses their own.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DoctorProfileDetailsView } from '@/components/admin/doctor/DoctorProfileDetailsView';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// Component defaults to a "This Month" filter computed from the real system clock. Fixtures that
// don't care about month-boundary behavior use a day within the real current month (via this
// helper) so they don't silently go dark once wall-clock time rolls past whatever month the
// fixture date was hardcoded to. The one test that DOES care about month boundaries
// (below, "date filter boundary") pins the clock itself with vi.setSystemTime and doesn't use
// userEvent, so it's unaffected by the userEvent/fake-timers interaction hang this helper avoids.
function thisMonthDate(day: number): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const DOCTOR_SARA = { id: 'doc-1', name: 'Dr. Sara Adel', specialty: 'Dermatology' };

function reservation(overrides: Record<string, any>) {
  return {
    id: 'res-1',
    date: thisMonthDate(10),
    customer_name: 'Patient A',
    customer_phone: '0100',
    service_name: 'Botox',
    branch_name: 'Maadi',
    status: 'completed',
    ...overrides,
  };
}

describe('visit history — doctor matching', () => {
  it('matches reservations by doctor_id, and excludes reservations belonging to a different doctor', () => {
    const reservations = [
      reservation({ id: 'r1', doctor_id: 'doc-1', customer_name: 'Own Patient' }),
      reservation({ id: 'r2', doctor_id: 'doc-2', customer_name: 'Other Doctor Patient' }),
    ];
    render(<DoctorProfileDetailsView doctor={DOCTOR_SARA} onBack={vi.fn()} reservations={reservations} />);
    expect(screen.getByText('Own Patient')).toBeInTheDocument();
    expect(screen.queryByText('Other Doctor Patient')).not.toBeInTheDocument();
  });

  it('falls back to matching by doctor name when no doctor_id is present on the reservation', () => {
    const reservations = [reservation({ id: 'r1', doctor_name: 'Dr. Sara Adel', customer_name: 'Name Matched Patient' })];
    render(<DoctorProfileDetailsView doctor={DOCTOR_SARA} onBack={vi.fn()} reservations={reservations} />);
    expect(screen.getByText('Name Matched Patient')).toBeInTheDocument();
  });

  it('shows the empty-state message instead of an empty table when nothing matches', () => {
    render(<DoctorProfileDetailsView doctor={DOCTOR_SARA} onBack={vi.fn()} reservations={[]} />);
    expect(screen.getByText(/No visit history found in database/)).toBeInTheDocument();
  });
});

describe('search and status filters', () => {
  const reservations = [
    reservation({ id: 'r1', doctor_id: 'doc-1', customer_name: 'Mona Ali', customer_phone: '0101', status: 'completed' }),
    reservation({ id: 'r2', doctor_id: 'doc-1', customer_name: 'Hana Sami', customer_phone: '0102', status: 'cancelled' }),
  ];

  it('search filters by patient name across the visible rows', async () => {
    const user = userEvent.setup();
    render(<DoctorProfileDetailsView doctor={DOCTOR_SARA} onBack={vi.fn()} reservations={reservations} />);
    await user.type(screen.getByPlaceholderText(/Search by patient name or phone/), 'Mona');
    expect(screen.getByText('Mona Ali')).toBeInTheDocument();
    expect(screen.queryByText('Hana Sami')).not.toBeInTheDocument();
  });

  it('the status filter dropdown narrows to Completed only', async () => {
    const user = userEvent.setup();
    render(<DoctorProfileDetailsView doctor={DOCTOR_SARA} onBack={vi.fn()} reservations={reservations} />);
    await user.click(screen.getByTitle('Filter'));
    await user.click(screen.getByRole('button', { name: 'Completed' }));
    expect(screen.getByText('Mona Ali')).toBeInTheDocument();
    expect(screen.queryByText('Hana Sami')).not.toBeInTheDocument();
  });
});

describe('date filter boundary — "This Month" (default)', () => {
  it('excludes a visit dated in a previous month and includes one dated this month', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00'));
    const reservations = [
      reservation({ id: 'r1', doctor_id: 'doc-1', date: '2026-08-05', customer_name: 'This Month Patient' }),
      reservation({ id: 'r2', doctor_id: 'doc-1', date: '2026-07-20', customer_name: 'Last Month Patient' }),
    ];
    render(<DoctorProfileDetailsView doctor={DOCTOR_SARA} onBack={vi.fn()} reservations={reservations} />);
    expect(screen.getByText('This Month Patient')).toBeInTheDocument();
    expect(screen.queryByText('Last Month Patient')).not.toBeInTheDocument();
  });
});

describe('pagination', () => {
  it('paginates at 5 rows per page and reports the correct "Showing X to Y of Z" range', () => {
    const reservations = Array.from({ length: 7 }, (_, i) =>
      reservation({ id: `r${i}`, doctor_id: 'doc-1', customer_name: `Patient ${i}`, date: thisMonthDate(10) })
    );
    render(<DoctorProfileDetailsView doctor={DOCTOR_SARA} onBack={vi.fn()} reservations={reservations} />);
    // "Showing 1 to 5 of 7 results" is split across sibling <span>s inside one <div>, so it's
    // matched as that div's full text content rather than as isolated text nodes.
    const summary = screen.getByText(
      (_content, element) => element?.tagName === 'DIV' && element.textContent === 'Showing 1 to 5 of 7 results'
    );
    expect(summary).toBeInTheDocument();
    // 7 rows at 5/page = 2 pages; only 5 rows render on page 1
    expect(screen.getAllByText(/^Patient \d$/)).toHaveLength(5);
  });

  it('changing rows-per-page shows more rows on a single page', async () => {
    const reservations = Array.from({ length: 7 }, (_, i) =>
      reservation({ id: `r${i}`, doctor_id: 'doc-1', customer_name: `Patient ${i}`, date: thisMonthDate(10) })
    );
    const user = userEvent.setup();
    render(<DoctorProfileDetailsView doctor={DOCTOR_SARA} onBack={vi.fn()} reservations={reservations} />);
    await user.selectOptions(screen.getByDisplayValue('5 / page'), '10');
    expect(screen.getAllByText(/^Patient \d$/)).toHaveLength(7);
  });

  it('page 2 shows the remaining rows', async () => {
    const reservations = Array.from({ length: 7 }, (_, i) =>
      reservation({ id: `r${i}`, doctor_id: 'doc-1', customer_name: `Patient ${i}`, date: thisMonthDate(10) })
    );
    const user = userEvent.setup();
    render(<DoctorProfileDetailsView doctor={DOCTOR_SARA} onBack={vi.fn()} reservations={reservations} />);
    await user.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getAllByText(/^Patient \d$/)).toHaveLength(2);
  });
});

describe('CSV export', () => {
  it('downloads a CSV named after the doctor, containing only the currently filtered rows', async () => {
    let capturedHref = '';
    let capturedDownload = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      capturedHref = this.getAttribute('href') || '';
      capturedDownload = this.getAttribute('download') || '';
    });

    const reservations = [
      reservation({ id: 'r1', doctor_id: 'doc-1', customer_name: 'Mona Ali', date: thisMonthDate(10) }),
      reservation({ id: 'r2', doctor_id: 'doc-1', customer_name: 'Hana Sami', date: thisMonthDate(11), status: 'cancelled' }),
    ];
    const user = userEvent.setup();
    render(<DoctorProfileDetailsView doctor={DOCTOR_SARA} onBack={vi.fn()} reservations={reservations} />);

    await user.click(screen.getByTitle('Filter'));
    await user.click(screen.getByRole('button', { name: 'Completed' }));
    await user.click(screen.getByRole('button', { name: /Export/ }));

    expect(capturedDownload).toBe('Dr._Sara_Adel_Visit_History.csv');
    const decoded = decodeURIComponent(capturedHref);
    expect(decoded).toContain('Mona Ali');
    expect(decoded).not.toContain('Hana Sami');
  });
});

describe('visit details modal', () => {
  it('opens with the selected visit\'s details and closes via the Close button', async () => {
    const reservations = [
      reservation({ id: 'r1', doctor_id: 'doc-1', customer_name: 'Mona Ali', notes: 'Mild redness observed.' }),
    ];
    const user = userEvent.setup();
    render(<DoctorProfileDetailsView doctor={DOCTOR_SARA} onBack={vi.fn()} reservations={reservations} />);

    await user.click(screen.getByTitle('View Visit Details'));
    expect(screen.getByText('Patient Visit Details')).toBeInTheDocument();
    expect(screen.getByText('Mild redness observed.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Patient Visit Details')).not.toBeInTheDocument();
  });
});

describe('working schedule default', () => {
  it('defaults to Friday off and 10AM–6PM on other days when no schedule is configured for the doctor', () => {
    render(<DoctorProfileDetailsView doctor={DOCTOR_SARA} onBack={vi.fn()} reservations={[]} />);
    const fridayRow = screen.getByText('Friday').closest('tr') as HTMLElement;
    expect(within(fridayRow).getByText('Off')).toBeInTheDocument();

    const mondayRow = screen.getByText('Monday').closest('tr') as HTMLElement;
    expect(within(mondayRow).getByText('10:00 AM - 06:00 PM')).toBeInTheDocument();

    const saturdayRow = screen.getByText('Saturday').closest('tr') as HTMLElement;
    expect(within(saturdayRow).getByText('10:00 AM - 04:00 PM')).toBeInTheDocument();
  });
});
