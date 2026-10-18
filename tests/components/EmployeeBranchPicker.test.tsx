/**
 * Add / Edit Employee branch picker (DEC-110).
 *
 * The owner's request: an employee can be assigned to more than one branch with tick boxes, and only
 * ACTIVE branches are offered. Edge case that must not regress: an employee already on a branch that
 * has since been deactivated keeps seeing that assignment (they would otherwise lose it silently the
 * next time someone saved the form).
 */
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmployeeBranchPicker, { type EmployeeBranchPickerLabels } from '@/components/admin/employees/EmployeeBranchPicker';
import { adminTranslations } from '@/components/admin/translations';
import type { Branch } from '@/types';

const BRANCHES = [
  { id: 'a', name_en: 'Zayed', name_ar: 'زايد', status: 'active' },
  { id: 'b', name_en: 'Compound', name_ar: 'كمبوند', status: 'active' },
  { id: 'c', name_en: 'New Cairo', name_ar: 'القاهرة الجديدة', status: 'active' },
  { id: 'x', name_en: 'Old Branch', name_ar: 'فرع قديم', status: 'inactive' },
] as Branch[];

const LABELS: EmployeeBranchPickerLabels = adminTranslations.en.employees.form;

/** Controlled wrapper so ticking actually re-renders, like the real form. */
function Harness({
  initial = [],
  original = [],
  onChange,
  lang = 'en',
  branches = BRANCHES,
}: {
  initial?: string[];
  original?: string[];
  onChange?: (ids: string[]) => void;
  lang?: 'en' | 'ar';
  branches?: Branch[];
}) {
  const [ids, setIds] = useState<string[]>(initial);
  return (
    <EmployeeBranchPicker
      branches={branches}
      selectedIds={ids}
      originalIds={original}
      onChange={(next) => {
        setIds(next);
        onChange?.(next);
      }}
      lang={lang}
      labels={lang === 'ar' ? adminTranslations.ar.employees.form : LABELS}
    />
  );
}

describe('EmployeeBranchPicker', () => {
  it('offers only active branches when adding a new employee', () => {
    render(<Harness />);

    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByRole('checkbox', { name: /Zayed/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Compound/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /New Cairo/ })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Old Branch/ })).not.toBeInTheDocument();
  });

  it('lets several branches be ticked and reports them in tick order', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole('checkbox', { name: /Compound/ }));
    await user.click(screen.getByRole('checkbox', { name: /Zayed/ }));

    expect(onChange).toHaveBeenLastCalledWith(['b', 'a']);
    expect(screen.getByRole('checkbox', { name: /Compound/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Zayed/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /New Cairo/ })).not.toBeChecked();
  });

  it('marks the first ticked branch as primary and lets another be made primary', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={['a', 'b']} onChange={onChange} />);

    // Exactly one "Primary" badge, on the first ticked branch.
    expect(screen.getAllByText('Primary')).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: /Zayed/ }).closest('li')).toHaveTextContent('Primary');

    await user.click(screen.getByRole('button', { name: 'Make primary' }));

    expect(onChange).toHaveBeenLastCalledWith(['b', 'a']);
    expect(screen.getByRole('checkbox', { name: /Compound/ }).closest('li')).toHaveTextContent('Primary');
    expect(screen.getByRole('checkbox', { name: /Zayed/ }).closest('li')).not.toHaveTextContent('Primary');
  });

  it('shows no "Make primary" control while only one branch is ticked', () => {
    render(<Harness initial={['a']} />);
    expect(screen.queryByRole('button', { name: 'Make primary' })).not.toBeInTheDocument();
  });

  it('flags an empty selection (at least one branch is required)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['a']} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Zayed/ }));

    expect(screen.getByRole('alert')).toHaveTextContent('Select at least one branch.');
  });

  it('keeps showing an existing assignment to a now-inactive branch, ticked and badged', () => {
    render(<Harness initial={['x', 'a']} original={['x', 'a']} />);

    const inactive = screen.getByRole('checkbox', { name: /Old Branch/ });
    expect(inactive).toBeChecked();
    expect(inactive.closest('li')).toHaveTextContent('Inactive');
    // ...and it is still the primary branch, not dropped or reordered.
    expect(inactive.closest('li')).toHaveTextContent('Primary');
  });

  it('lets the inactive assignment be removed and re-ticked within the same edit, but never offers other inactive branches', async () => {
    const user = userEvent.setup();
    const extraInactive = [...BRANCHES, { id: 'y', name_en: 'Other Closed', name_ar: 'مغلق آخر', status: 'inactive' } as Branch];
    render(<Harness initial={['x', 'a']} original={['x', 'a']} branches={extraInactive} />);

    expect(screen.queryByRole('checkbox', { name: /Other Closed/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /Old Branch/ }));
    expect(screen.getByRole('checkbox', { name: /Old Branch/ })).not.toBeChecked();
    // Still listed so the change can be undone before saving.
    await user.click(screen.getByRole('checkbox', { name: /Old Branch/ }));
    expect(screen.getByRole('checkbox', { name: /Old Branch/ })).toBeChecked();
  });

  it('tells the admin when there is no active branch to assign', () => {
    render(<Harness branches={[BRANCHES[3]]} />);

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByRole('alert')).toHaveTextContent('There are no active branches');
  });

  it('renders Arabic names and labels in Arabic mode', () => {
    render(<Harness lang="ar" initial={['a']} />);

    expect(screen.getByRole('checkbox', { name: /زايد/ })).toBeChecked();
    expect(screen.getByText(adminTranslations.ar.employees.form.assignedBranches, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(adminTranslations.ar.employees.form.branchPrimary)).toBeInTheDocument();
  });

  it('uses logical (RTL-safe) alignment classes and no physical left/right text alignment', () => {
    const { container } = render(<Harness initial={['a', 'b']} />);
    const html = container.innerHTML;

    expect(html).toContain('text-start');
    expect(html).not.toMatch(/\b(text-left|text-right|pl-\d|pr-\d|ml-\d|mr-\d)\b/);
  });
});
