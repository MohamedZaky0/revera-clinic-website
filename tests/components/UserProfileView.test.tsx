/**
 * Salary, target-progress and commission figures come from the signed-in person's own records, read through
 * `GET /api/profile`, `/api/profile/payroll` and `/api/profile/attendance` (RISK-128). The screen used to read
 * employee_accounts, providers, hr_attendance, doctor_payroll and reservations straight from the browser with
 * the public key, which only worked while old "allow all" policies left those tables open. These tests answer
 * those routes through the fetch fake, check what the screen asks for, and assert that it no longer touches any
 * table directly. The server side (who may see what, the revenue filtering) is covered in tests/routes/profile.test.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFetchFake } from '../helpers/fetchFake';

const fetchFake = createFetchFake();
const mockUpdateUser = vi.fn();
const tablesRead: string[] = [];

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      tablesRead.push(table);
      throw new Error(`UserProfileView must not read ${table} directly`);
    },
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'test-token' } } }),
      updateUser: (...args: any[]) => mockUpdateUser(...args),
    },
  },
}));

import UserProfileView, { type UserProfileData } from '@/components/admin/UserProfileView';

beforeEach(() => {
  tablesRead.length = 0;
  fetchFake.reset();
  vi.stubGlobal('fetch', fetchFake.fetch);
  mockUpdateUser.mockReset();
  mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null });
  stubProfileApi({});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

type ProfileApiData = { employee?: any; provider?: any; doctorPayroll?: any; targetRevenue?: number };

function stubProfileApi(data: ProfileApiData) {
  fetchFake.on('GET', '/api/profile', () => ({ status: 200, body: { employee: data.employee ?? null, provider: data.provider ?? null } }));
  fetchFake.on('GET', '/api/profile/payroll', () => ({
    status: 200,
    body: { employee: data.employee ?? null, provider: data.provider ?? null, doctorPayroll: data.doctorPayroll ?? null, targetRevenue: data.targetRevenue ?? 0 },
  }));
  fetchFake.on('GET', '/api/profile/attendance', () => ({ status: 200, body: [] }));
  fetchFake.on('GET', '/api/branches', () => ({ status: 200, body: [] }));
}

const BASE_USER: UserProfileData = {
  name: 'Dr. Sara Adel',
  email: 'sara@clinic.com',
  role: 'Doctor',
};

describe('data comes from the profile API, never from direct table reads', () => {
  it('asks the API for the profile, the pay summary and attendance with the bearer token, and reads no table', async () => {
    render(<UserProfileView user={{ ...BASE_USER, id: 'emp-1', role: 'Receptionist' }} />);
    await screen.findByText('Personal Information');

    await waitFor(() => {
      const paths = fetchFake.calls.map((c) => c.path);
      expect(paths).toEqual(expect.arrayContaining(['/api/profile', '/api/profile/payroll', '/api/profile/attendance', '/api/branches']));
    });
    for (const path of ['/api/profile', '/api/profile/payroll', '/api/profile/attendance']) {
      const call = fetchFake.calls.find((c) => c.path === path)!;
      expect(call.headers.authorization || call.headers.Authorization).toBe('Bearer test-token');
    }
    expect(tablesRead).toEqual([]);
  });

  it('asks for the current month in the viewer\'s own timezone, as a doctor or as staff', async () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    render(<UserProfileView user={{ ...BASE_USER, id: 'doc-1' }} isDoctorView />);

    await waitFor(() => expect(fetchFake.calls.some((c) => c.path === '/api/profile/payroll')).toBe(true));
    const call = fetchFake.calls.find((c) => c.path === '/api/profile/payroll')!;
    expect(call.query.get('view')).toBe('doctor');
    expect(call.query.get('from')).toBe(`${month}-01`);
    expect(call.query.get('to')!.startsWith(month)).toBe(true);
  });
});

describe('doctor payroll — net salary math', () => {
  it('sums fixed salary + commission - deductions from the doctor_payroll row returned for the current month', async () => {
    stubProfileApi({
      provider: { id: 'doc-1', name: 'Dr. Sara Adel', fixed_salary: 15000, target_amount: 60000 },
      doctorPayroll: { id: 'dp1', provider_id: 'doc-1', fixed_salary: 15000, calculated_commission: 3200, deductions: 500 },
    });

    render(<UserProfileView user={{ ...BASE_USER, id: 'doc-1' }} isDoctorView />);

    // netSalary = 15000 (fixed) + 3200 (commission) - 500 (deductions) = 17700
    expect(await screen.findByText('17,700 EGP')).toBeInTheDocument();
  });

  it('falls back to the provider row (fixed_salary/target_amount) when there is no doctor_payroll row yet for this month', async () => {
    stubProfileApi({ provider: { id: 'doc-1', name: 'Dr. Sara Adel', fixed_salary: 12000, target_amount: 50000 } });

    render(<UserProfileView user={{ ...BASE_USER, id: 'doc-1' }} isDoctorView />);

    // no commission/deductions row yet -> netSalary = basicSalary only = 12000; both the "Fixed /
    // Basic Salary" line and the "Net Salary" highlight legitimately show the same figure.
    expect(await screen.findAllByText('12,000 EGP')).toHaveLength(2);
  });
});

describe('staff payroll — net salary math', () => {
  it('sums salary + bonus - deductions from the employee record', async () => {
    stubProfileApi({ employee: { id: 'emp-1', email: 'sara@clinic.com', salary: 8000, bonus: 1000, deductions: 200 } });

    render(<UserProfileView user={{ ...BASE_USER, id: 'emp-1', role: 'Receptionist' }} />);

    // netSalary = 8000 + 1000 - 200 = 8800
    expect(await screen.findByText('8,800 EGP')).toBeInTheDocument();
  });

  it('derives bonus from bonus_percentage of salary when no flat bonus is set', async () => {
    stubProfileApi({ employee: { id: 'emp-1', email: 'sara@clinic.com', salary: 10000, bonus_percentage: 10, deductions: 0 } });

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
    stubProfileApi({ provider: { id: 'doc-1', name: 'Dr. Sara Adel', fixed_salary: null, target_amount: null } });

    render(<UserProfileView user={{ ...BASE_USER, id: 'doc-1' }} isDoctorView />);

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3));
    expectNoInventedFigures();
  });

  it('a doctor with no provider row at all shows "—", not 15,000 / 60,000', async () => {
    render(<UserProfileView user={{ ...BASE_USER, id: 'doc-1' }} isDoctorView />);

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3));
    expectNoInventedFigures();
  });

  it('a staff member with no salary/target on the employee record shows "—", not 8,000 / 50,000', async () => {
    stubProfileApi({ employee: { id: 'emp-1', email: 'sara@clinic.com', salary: null, required_target_amount: null } });

    render(<UserProfileView user={{ ...BASE_USER, id: 'emp-1', role: 'Receptionist' }} />);

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3));
    expectNoInventedFigures();
  });

  it('a staff member the API returns no employee record for shows "—", not 8,000 / 50,000', async () => {
    render(<UserProfileView user={{ ...BASE_USER, id: 'emp-9', role: 'Receptionist' }} />);

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3));
    expectNoInventedFigures();
  });

  it('still shows "—" (not an invented figure) when the pay summary request fails', async () => {
    fetchFake.on('GET', '/api/profile/payroll', () => ({ status: 500, body: { error: 'boom' } }));

    render(<UserProfileView user={{ ...BASE_USER, id: 'doc-1' }} isDoctorView />);

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3));
    expectNoInventedFigures();
  });
});

describe('target progress', () => {
  // The server adds up the paid amount on the caller's own bookings (tests/routes/profile.test.ts); the
  // screen shows that figure against the target.
  it('shows the collected amount the API returns against the doctor\'s target', async () => {
    stubProfileApi({ provider: { id: 'doc-1', name: 'Dr. Sara Adel', fixed_salary: 15000, target_amount: 20000 }, targetRevenue: 5000 });

    render(<UserProfileView user={{ ...BASE_USER, id: 'doc-1' }} isDoctorView />);

    // 5000 / 20000 = 25%
    expect(await screen.findByText('5,000 / 20,000 EGP (25%)')).toBeInTheDocument();
  });

  it('caps the displayed target percentage at 100 even when revenue exceeds the target', async () => {
    stubProfileApi({ provider: { id: 'doc-1', name: 'Dr. Sara Adel', fixed_salary: 15000, target_amount: 10000 }, targetRevenue: 25000 });

    render(<UserProfileView user={{ ...BASE_USER, id: 'doc-1' }} isDoctorView />);

    expect(await screen.findByText('25,000 / 10,000 EGP (100%)')).toBeInTheDocument();
  });
});

describe('edit personal information', () => {
  it('opens pre-filled with the current contact details and calls onUpdateUser with the edited values', async () => {
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

  async function renderAndOpen() {
    const user = userEvent.setup();
    render(<UserProfileView user={{ ...BASE_USER, id: 'emp-1' }} />);
    await screen.findByText('Personal Information');
    return user;
  }

  async function submit(user: ReturnType<typeof userEvent.setup>, pwd: string, confirm = pwd) {
    await user.type(screen.getByPlaceholderText('Enter new password'), pwd);
    await user.type(screen.getByPlaceholderText('Confirm new password'), confirm);
    await user.click(screen.getByRole('button', { name: 'Update Password' }));
  }

  it('is an always-visible Security card on the page, not a button that opens a modal', async () => {
    await renderAndOpen();

    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter new password')).toBeInTheDocument();
    expect(screen.getByText(/At least 8 characters with an uppercase letter/)).toBeInTheDocument();
  });

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
