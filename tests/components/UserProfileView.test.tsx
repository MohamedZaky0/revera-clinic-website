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

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: (table: string) => fake.client.from(table) },
}));

import UserProfileView, { type UserProfileData } from '@/components/admin/UserProfileView';

beforeEach(() => {
  fake.reset();
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
  // KNOWN BUG, not previously logged in ai_docs/RISKS.md (surfaced by this test pass — see the
  // batch report). `getDateRange()` in UserProfileView.tsx builds `monthStr` from
  // `new Date(year, month, 1).toISOString().split("T")[0]`. `new Date(year, month, 1)` is
  // LOCAL midnight; `.toISOString()` converts to UTC. In any timezone ahead of UTC — including
  // Africa/Cairo, this clinic's own timezone — local midnight on the 1st is still the previous day
  // in UTC, so `monthStr` resolves to LAST month, not this one. `doctor_payroll` is looked up with
  // `.eq("month", monthStr)`, so a doctor's current-month payroll row is silently never found (or
  // the wrong month's row is matched) for the whole clinic's timezone. Reproduced directly against
  // this sandbox's Europe/Berlin (UTC+2) clock.
  it.fails('sums fixed salary + commission - deductions from the doctor_payroll row for the actual current month', async () => {
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
  async function openModal(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /Change Password/ }));
  }

  it('rejects a password shorter than 6 characters without calling onUpdatePassword', async () => {
    fake.seed('branches', []);
    fake.seed('employee_accounts', [{ id: 'emp-1', email: 'sara@clinic.com' }]);
    fake.seed('reservations', []);
    const onUpdatePassword = vi.fn();
    const user = userEvent.setup();
    render(<UserProfileView user={{ ...BASE_USER, id: 'emp-1' }} onUpdatePassword={onUpdatePassword} />);
    await screen.findByText('Personal Information');
    await openModal(user);

    await user.type(screen.getByPlaceholderText('Enter new password'), '123');
    await user.type(screen.getByPlaceholderText('Confirm new password'), '123');
    await user.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(await screen.findByText('Password must be at least 6 characters long.')).toBeInTheDocument();
    expect(onUpdatePassword).not.toHaveBeenCalled();
  });

  it('rejects mismatched passwords without calling onUpdatePassword', async () => {
    fake.seed('branches', []);
    fake.seed('employee_accounts', [{ id: 'emp-1', email: 'sara@clinic.com' }]);
    fake.seed('reservations', []);
    const onUpdatePassword = vi.fn();
    const user = userEvent.setup();
    render(<UserProfileView user={{ ...BASE_USER, id: 'emp-1' }} onUpdatePassword={onUpdatePassword} />);
    await screen.findByText('Personal Information');
    await openModal(user);

    await user.type(screen.getByPlaceholderText('Enter new password'), 'password1');
    await user.type(screen.getByPlaceholderText('Confirm new password'), 'password2');
    await user.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(onUpdatePassword).not.toHaveBeenCalled();
  });

  it('calls onUpdatePassword with the new password when valid and matching', async () => {
    fake.seed('branches', []);
    fake.seed('employee_accounts', [{ id: 'emp-1', email: 'sara@clinic.com' }]);
    fake.seed('reservations', []);
    const onUpdatePassword = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<UserProfileView user={{ ...BASE_USER, id: 'emp-1' }} onUpdatePassword={onUpdatePassword} />);
    await screen.findByText('Personal Information');
    await openModal(user);

    await user.type(screen.getByPlaceholderText('Enter new password'), 'newpassword123');
    await user.type(screen.getByPlaceholderText('Confirm new password'), 'newpassword123');
    await user.click(screen.getByRole('button', { name: 'Update Password' }));

    await waitFor(() => expect(onUpdatePassword).toHaveBeenCalledWith('newpassword123'));
  });
});
