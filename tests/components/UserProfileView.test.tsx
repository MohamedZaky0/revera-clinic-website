/**
 * Salary, target-progress, and commission figures here come from direct client-side Supabase reads
 * (`@/lib/supabaseClient`, the anon-key browser client) — NOT from an authenticated API route. That
 * contradicts ai_docs/RISKS.md RISK-019's claim that "no client component reads or writes a
 * Supabase table any more" (see the batch report). This file is mocked with the same
 * `createSupabaseFake` used for route tests so the queries this component builds are exercised for
 * real, not just stubbed to return whatever the test expects.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSupabaseFake } from '../helpers/supabaseFake';

const fake = createSupabaseFake();
const mockUpdateUser = vi.fn();

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => fake.client.from(table),
    auth: { updateUser: (...args: any[]) => mockUpdateUser(...args) },
  },
}));

import UserProfileView, { type UserProfileData } from '@/components/admin/UserProfileView';

beforeEach(() => {
  fake.reset();
  mockUpdateUser.mockReset();
  mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function longAgoStr(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}

const BASE_USER: UserProfileData = {
  name: 'Dr. Sara Adel',
  email: 'sara@clinic.com',
  role: 'Doctor',
};

describe('doctor payroll — net salary math', () => {
  // RISK-111, fixed 2026-09-30: getDateRange() used to build start/end strings via
  // `new Date(year, month, day).toISOString().split("T")[0]` — local midnight converted through
  // UTC, which rolls back a day in any timezone ahead of UTC (including Africa/Cairo, this clinic's
  // own timezone). `monthStr = startStr.slice(0, 7)` therefore resolved to last month, so
  // `doctor_payroll` was looked up under the wrong month and a doctor's current-month row was never
  // found. Fixed by formatting from the Date's own local getters (`toLocalDateStr`) instead of
  // round-tripping through UTC. This also fixed the two "target progress" tests below, which had the
  // same root cause (today's reservations falling just outside the UTC-shifted end boundary).
  it('sums fixed salary + commission - deductions from the doctor_payroll row for the actual current month', async () => {
    const now = new Date();
    const realCurrentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    fake.seed('branches', []);
    fake.seed('providers', [{ id: 'doc-1', name: 'Dr. Sara Adel', fixed_salary: 15000, target_amount: 60000 }]);
    fake.seed('doctor_payroll', [
      {
        id: 'dp1',
        provider_id: 'doc-1',
        month: realCurrentMonth,
        fixed_salary: 15000,
        calculated_commission: 3200,
        deductions: 500,
      },
    ]);
    fake.seed('reservations', []);

    render(<UserProfileView user={{ ...BASE_USER, id: 'doc-1' }} isDoctorView />);

    // netSalary = 15000 (fixed) + 3200 (commission) - 500 (deductions) = 17700
    expect(await screen.findByText('17,700 EGP')).toBeInTheDocument();
  });

  it('falls back to the providers row (fixed_salary/target_amount) when no doctor_payroll row exists yet for this month', async () => {
    fake.seed('branches', []);
    fake.seed('providers', [{ id: 'doc-1', name: 'Dr. Sara Adel', fixed_salary: 12000, target_amount: 50000 }]);
    fake.seed('doctor_payroll', []);
    fake.seed('reservations', []);

    render(<UserProfileView user={{ ...BASE_USER, id: 'doc-1' }} isDoctorView />);

    // no commission/deductions row yet -> netSalary = basicSalary only = 12000; both the "Fixed /
    // Basic Salary" line and the "Net Salary" highlight legitimately show the same figure.
    expect(await screen.findAllByText('12,000 EGP')).toHaveLength(2);
  });
});

describe('staff payroll — net salary math', () => {
  it('sums salary + bonus - deductions from employee_accounts', async () => {
    fake.seed('branches', []);
    fake.seed('employee_accounts', [{ id: 'emp-1', email: 'sara@clinic.com', salary: 8000, bonus: 1000, deductions: 200 }]);
    fake.seed('reservations', []);

    render(<UserProfileView user={{ ...BASE_USER, id: 'emp-1', role: 'Receptionist' }} />);

    // netSalary = 8000 + 1000 - 200 = 8800
    expect(await screen.findByText('8,800 EGP')).toBeInTheDocument();
  });

  it('derives bonus from bonus_percentage of salary when no flat bonus is set', async () => {
    fake.seed('branches', []);
    fake.seed('employee_accounts', [{ id: 'emp-1', email: 'sara@clinic.com', salary: 10000, bonus_percentage: 10, deductions: 0 }]);
    fake.seed('reservations', []);

    render(<UserProfileView user={{ ...BASE_USER, id: 'emp-1' }} />);

    // bonus = 10000 * 10 / 100 = 1000; netSalary = 10000 + 1000 - 0 = 11000
    expect(await screen.findByText('11,000 EGP')).toBeInTheDocument();
  });
});

describe('salary and target that were never entered are not invented', () => {
  // The profile used to substitute 15,000 / 60,000 (doctor) and 8,000 / 50,000 (staff) whenever the
  // database had no salary or target, presenting made-up money as the person's real pay.
  const INVENTED = [/15,000/, /60,000/, /8,000/, /50,000/];

  function expectNoInventedFigures() {
    for (const re of INVENTED) expect(screen.queryByText(re)).not.toBeInTheDocument();
  }

  it('a doctor whose provider row has no salary/target shows "—", not 15,000 / 60,000', async () => {
    fake.seed('branches', []);
    fake.seed('providers', [{ id: 'doc-1', name: 'Dr. Sara Adel', fixed_salary: null, target_amount: null }]);
    fake.seed('doctor_payroll', []);
    fake.seed('reservations', []);

    render(<UserProfileView user={{ ...BASE_USER, id: 'doc-1' }} isDoctorView />);

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3));
    expectNoInventedFigures();
  });

  it('a doctor with no provider row at all shows "—", not 15,000 / 60,000', async () => {
    fake.seed('branches', []);
    fake.seed('providers', []);
    fake.seed('doctor_payroll', []);
    fake.seed('reservations', []);

    render(<UserProfileView user={{ ...BASE_USER, id: 'doc-1' }} isDoctorView />);

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3));
    expectNoInventedFigures();
  });

  it('a staff member with no salary/target in employee_accounts shows "—", not 8,000 / 50,000', async () => {
    fake.seed('branches', []);
    fake.seed('employee_accounts', [{ id: 'emp-1', email: 'sara@clinic.com', salary: null, required_target_amount: null }]);
    fake.seed('reservations', []);

    render(<UserProfileView user={{ ...BASE_USER, id: 'emp-1', role: 'Receptionist' }} />);

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3));
    expectNoInventedFigures();
  });

  it('a staff member with no employee_accounts row at all shows "—", not 8,000 / 50,000', async () => {
    fake.seed('branches', []);
    fake.seed('employee_accounts', []);
    fake.seed('reservations', []);

    render(<UserProfileView user={{ ...BASE_USER, id: 'emp-9', role: 'Receptionist' }} />);

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3));
    expectNoInventedFigures();
  });
});

describe('target progress', () => {
  it('sums only this doctor\'s completed/confirmed/approved/started reservations in the current month toward the target', async () => {
    fake.seed('branches', []);
    fake.seed('providers', [{ id: 'doc-1', name: 'Dr. Sara Adel', fixed_salary: 15000, target_amount: 20000 }]);
    fake.seed('doctor_payroll', []);
    fake.seed('reservations', [
      { id: 'r1', doctor_name: 'Dr. Sara Adel', provider_id: 'doc-1', status: 'completed', date: todayStr(), amount_paid: 5000, price: 5000 },
      { id: 'r2', doctor_name: 'Dr. Sara Adel', provider_id: 'doc-1', status: 'pending', date: todayStr(), amount_paid: 9999, price: 9999 },
      { id: 'r3', doctor_name: 'Dr. Omar', provider_id: 'doc-2', status: 'completed', date: todayStr(), amount_paid: 8000, price: 8000 },
      { id: 'r4', doctor_name: 'Dr. Sara Adel', provider_id: 'doc-1', status: 'confirmed', date: longAgoStr(), amount_paid: 7000, price: 7000 },
    ]);

    render(<UserProfileView user={{ ...BASE_USER, id: 'doc-1' }} isDoctorView />);

    // only r1 counts: 5000 / 20000 = 25%
    expect(await screen.findByText('5,000 / 20,000 EGP (25%)')).toBeInTheDocument();
  });

  it('caps the displayed target percentage at 100 even when revenue exceeds the target', async () => {
    fake.seed('branches', []);
    fake.seed('providers', [{ id: 'doc-1', name: 'Dr. Sara Adel', fixed_salary: 15000, target_amount: 10000 }]);
    fake.seed('doctor_payroll', []);
    fake.seed('reservations', [
      { id: 'r1', doctor_name: 'Dr. Sara Adel', provider_id: 'doc-1', status: 'completed', date: todayStr(), amount_paid: 25000, price: 25000 },
    ]);

    render(<UserProfileView user={{ ...BASE_USER, id: 'doc-1' }} isDoctorView />);

    expect(await screen.findByText('25,000 / 10,000 EGP (100%)')).toBeInTheDocument();
  });
});

describe('edit personal information', () => {
  it('opens pre-filled with the current contact details and calls onUpdateUser with the edited values', async () => {
    fake.seed('branches', []);
    fake.seed('employee_accounts', [{ id: 'emp-1', email: 'sara@clinic.com', salary: 8000 }]);
    fake.seed('reservations', []);
    const onUpdateUser = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <UserProfileView
        user={{ ...BASE_USER, id: 'emp-1', phone: '0100', address: 'Maadi' }}
        onUpdateUser={onUpdateUser}
      />
    );
    await screen.findByText('Personal Information');

    await user.click(screen.getByRole('button', { name: /Edit/ }));
    const emailInput = screen.getByDisplayValue('sara@clinic.com');
    await user.clear(emailInput);
    await user.type(emailInput, 'sara.adel@clinic.com');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(onUpdateUser).toHaveBeenCalledWith({ email: 'sara.adel@clinic.com', phone: '0100', address: 'Maadi' })
    );
  });
});

describe('change password', () => {
  const STRONG = 'Str0ng!Pass';

  async function openModal(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /Change Password/ }));
  }

  async function renderAndOpen() {
    fake.seed('branches', []);
    fake.seed('employee_accounts', [{ id: 'emp-1', email: 'sara@clinic.com' }]);
    fake.seed('reservations', []);
    const user = userEvent.setup();
    render(<UserProfileView user={{ ...BASE_USER, id: 'emp-1' }} />);
    await screen.findByText('Personal Information');
    await openModal(user);
    return user;
  }

  async function submit(user: ReturnType<typeof userEvent.setup>, pwd: string, confirm = pwd) {
    await user.type(screen.getByPlaceholderText('Enter new password'), pwd);
    await user.type(screen.getByPlaceholderText('Confirm new password'), confirm);
    await user.click(screen.getByRole('button', { name: 'Update Password' }));
  }

  it('rejects a password that breaks the 8+ / upper / lower / digit / symbol rule without calling Supabase', async () => {
    const user = await renderAndOpen();
    await submit(user, 'newpassword123'); // 14 chars, but no uppercase and no symbol

    expect(await screen.findByText(/at least 8 characters and include an uppercase letter/)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('rejects mismatched passwords without calling Supabase', async () => {
    const user = await renderAndOpen();
    await submit(user, STRONG, 'Str0ng!Pasz');

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('really changes the password through Supabase and only then reports success', async () => {
    const user = await renderAndOpen();
    await submit(user, STRONG);

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ password: STRONG }));
    expect(await screen.findByText('Password updated successfully!')).toBeInTheDocument();
  });

  it('shows the failure and NOT a success message when Supabase refuses the change', async () => {
    mockUpdateUser.mockResolvedValue({ data: { user: null }, error: { message: 'New password should be different from the old password.' } });
    const user = await renderAndOpen();
    await submit(user, STRONG);

    expect(await screen.findByText('New password should be different from the old password.')).toBeInTheDocument();
    expect(screen.queryByText('Password updated successfully!')).not.toBeInTheDocument();
  });
});
