/**
 * The real Add / Edit Employee form, end to end at the component level (DEC-110).
 *
 * The product owner asked for two things on Add Employee: an employee can be assigned to more than
 * one branch with tick boxes, and only ACTIVE branches are offered. These tests drive the actual
 * AdminEmployeesView (not just the picker) and read what it POSTs / PATCHes, so they fail if the
 * picker is ever unplugged from the form or the payload stops carrying the whole ordered assignment.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminEmployeesView from '@/components/admin/employees/AdminEmployeesView';
import { adminTranslations } from '@/components/admin/translations';
import type { Branch } from '@/types';

const BRANCHES = [
  // The inactive branch is deliberately FIRST: the old Add form pre-selected branches[0] whatever its status.
  { id: 'b-old', name_en: 'Old Branch', name_ar: 'فرع قديم', status: 'inactive', sort_order: 0 },
  { id: 'b-zayed', name_en: 'Zayed', name_ar: 'زايد', status: 'active', sort_order: 1 },
  { id: 'b-compound', name_en: 'Compound', name_ar: 'كمبوند', status: 'active', sort_order: 2 },
  { id: 'b-cairo', name_en: 'New Cairo', name_ar: 'القاهرة الجديدة', status: 'active', sort_order: 3 },
] as Branch[];

const t = adminTranslations.en.employees;

const fetchMock = vi.fn();

/**
 * The page owns `isEditingEmployeeModalOpen` / `editingEmployee` as props. A tiny stateful host gives
 * the component the same open/close behaviour it has inside the admin shell.
 */
function Host({ employeesList = [] as any[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const noop = () => undefined;
  return (
    <AdminEmployeesView
      newEmployeeName={name} setNewEmployeeName={setName}
      newEmployeeEmail={email} setNewEmployeeEmail={setEmail}
      newEmployeeRole={role} setNewEmployeeRole={setRole}
      viewingEmployee={viewing} setViewingEmployee={setViewing}
      editingEmployee={editing} setEditingEmployee={setEditing}
      isEditingEmployeeModalOpen={open} setIsEditingEmployeeModalOpen={setOpen}
      branches={BRANCHES}
      rolesList={[{ name: 'receptionist' }, { name: 'doctor' }]}
      departmentsList={['Receptionist', 'Doctors']}
      employeesList={employeesList}
      loadingRolesAndEmployees={false}
      attendanceList={[]}
      loadingAttendance={false}
      providers={[]}
      fetchProviders={noop}
      customerAvatars={{}}
      handleAvatarUpload={noop}
      handleAvatarRemove={noop}
      allServicesList={[]}
      session={{ access_token: 'tok' }}
      fetchHrAttendance={noop}
      handleDeleteEmployee={noop}
      handleResendInvitation={noop}
      fetchRolesAndEmployees={noop}
      getDoctorFirstReservationDate={() => null}
      allReservations={[]}
      parseEgyptianNationalId={() => ({})}
      employeeProfileActiveTab="overview"
      setEmployeeProfileActiveTab={noop}
      lang="en"
      t={t}
    />
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('alert', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function lastEmployeesCall(method: 'POST' | 'PATCH') {
  const call = [...fetchMock.mock.calls].reverse().find(([url, init]) => url === '/api/employees' && init?.method === method);
  return call ? { init: call[1], body: JSON.parse(call[1].body as string) } : null;
}

describe('Add Employee — branch assignment', () => {
  it('offers only ACTIVE branches as tick boxes', async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.click(screen.getByRole('button', { name: new RegExp(t.addEmployeeBtn) }));

    const picker = screen.getByTestId('employee-branch-picker');
    expect(within(picker).getAllByRole('checkbox')).toHaveLength(3);
    expect(within(picker).getByRole('checkbox', { name: /Zayed/ })).toBeInTheDocument();
    expect(within(picker).getByRole('checkbox', { name: /Compound/ })).toBeInTheDocument();
    expect(within(picker).getByRole('checkbox', { name: /New Cairo/ })).toBeInTheDocument();
    expect(within(picker).queryByRole('checkbox', { name: /Old Branch/ })).not.toBeInTheDocument();
  });

  it('pre-ticks the first ACTIVE branch, not branches[0] when that one is inactive', async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.click(screen.getByRole('button', { name: new RegExp(t.addEmployeeBtn) }));

    const picker = screen.getByTestId('employee-branch-picker');
    expect(within(picker).getByRole('checkbox', { name: /Zayed/ })).toBeChecked();
    expect(within(picker).getByRole('checkbox', { name: /Compound/ })).not.toBeChecked();
  });

  it('POSTs every ticked branch, in tick order, so the first one is the primary', async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.click(screen.getByRole('button', { name: new RegExp(t.addEmployeeBtn) }));

    await user.type(screen.getByPlaceholderText(t.form.fullNamePlaceholder), 'Mona Ali');
    await user.type(screen.getByPlaceholderText(t.form.emailPlaceholder), 'mona@clinic.test');

    const picker = screen.getByTestId('employee-branch-picker');
    await user.click(within(picker).getByRole('checkbox', { name: /Compound/ }));
    await user.click(within(picker).getByRole('checkbox', { name: /New Cairo/ }));
    await user.click(within(picker).getAllByRole('button', { name: t.form.branchMakePrimary })[0]); // Compound -> primary

    await user.click(screen.getByRole('button', { name: t.modal.sendInvitationBtn }));

    await waitFor(() => expect(lastEmployeesCall('POST')).not.toBeNull());
    expect(lastEmployeesCall('POST')!.body.branchIds).toEqual(['b-compound', 'b-zayed', 'b-cairo']);
  });

  it('refuses to submit with no branch ticked and sends nothing', async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.click(screen.getByRole('button', { name: new RegExp(t.addEmployeeBtn) }));

    await user.type(screen.getByPlaceholderText(t.form.fullNamePlaceholder), 'Mona Ali');
    await user.type(screen.getByPlaceholderText(t.form.emailPlaceholder), 'mona@clinic.test');
    const picker = screen.getByTestId('employee-branch-picker');
    await user.click(within(picker).getByRole('checkbox', { name: /Zayed/ })); // untick the only one

    expect(within(picker).getByRole('alert')).toHaveTextContent(t.form.branchRequired);
    await user.click(screen.getByRole('button', { name: t.modal.sendInvitationBtn }));

    expect(window.alert).toHaveBeenCalledWith(t.form.branchRequired);
    expect(lastEmployeesCall('POST')).toBeNull();
  });
});

describe('Edit Employee — branch assignment', () => {
  const MULTI = {
    id: 'e-1', employee_id: 'EMP-1', email: 'sara@clinic.test', name: 'Sara', role_name: 'receptionist',
    department: 'Receptionist', shift: 'Day', salary: 5000, phone: '0100',
    branch_id: 'b-old', branch_ids: ['b-old', 'b-zayed'], created_at: '2026-01-01',
    requiredTargetAmount: 0, bonusPercentage: 0,
  };

  async function openEdit(emp: any) {
    const user = userEvent.setup();
    render(<Host employeesList={[emp]} />);
    await user.click(screen.getAllByRole('button', { name: new RegExp(t.actions.editEmployee) })[0]);
    return user;
  }

  it('keeps showing an existing assignment to a now-inactive branch (ticked, primary, badged)', async () => {
    await openEdit(MULTI);

    const picker = screen.getByTestId('employee-branch-picker');
    const old = within(picker).getByRole('checkbox', { name: /Old Branch/ });
    expect(old).toBeChecked();
    expect(old.closest('li')).toHaveTextContent(t.form.branchInactive);
    expect(old.closest('li')).toHaveTextContent(t.form.branchPrimary);
    expect(within(picker).getByRole('checkbox', { name: /Zayed/ })).toBeChecked();
  });

  it('re-saves the inactive assignment untouched (it is not silently dropped) and adds the new one', async () => {
    const user = await openEdit(MULTI);

    const picker = screen.getByTestId('employee-branch-picker');
    await user.click(within(picker).getByRole('checkbox', { name: /New Cairo/ }));
    await user.click(screen.getByRole('button', { name: t.modal.saveChangesBtn }));

    await waitFor(() => expect(lastEmployeesCall('PATCH')).not.toBeNull());
    expect(lastEmployeesCall('PATCH')!.body.branchIds).toEqual(['b-old', 'b-zayed', 'b-cairo']);
  });

  it('a single-branch employee written before the migration (branch_id only) opens with that branch ticked and saves it as a one-item list', async () => {
    const user = await openEdit({ ...MULTI, branch_id: 'b-compound', branch_ids: undefined });

    const picker = screen.getByTestId('employee-branch-picker');
    expect(within(picker).getByRole('checkbox', { name: /Compound/ })).toBeChecked();
    expect(within(picker).getAllByRole('checkbox').filter((c) => (c as HTMLInputElement).checked)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: t.modal.saveChangesBtn }));

    await waitFor(() => expect(lastEmployeesCall('PATCH')).not.toBeNull());
    expect(lastEmployeesCall('PATCH')!.body.branchIds).toEqual(['b-compound']);
  });

  it('does not offer an inactive branch the employee is NOT on', async () => {
    await openEdit({ ...MULTI, branch_id: 'b-zayed', branch_ids: ['b-zayed'] });

    const picker = screen.getByTestId('employee-branch-picker');
    expect(within(picker).queryByRole('checkbox', { name: /Old Branch/ })).not.toBeInTheDocument();
  });
});
