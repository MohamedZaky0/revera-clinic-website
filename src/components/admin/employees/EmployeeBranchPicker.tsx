"use client";

import type { Branch } from "@/types";
import {
  branchesOfferedFor,
  makePrimaryBranch,
  toggleBranchSelection,
} from "@/lib/employeeBranches";

export interface EmployeeBranchPickerLabels {
  assignedBranches: string;
  assignedBranchesHint: string;
  branchPrimary: string;
  branchMakePrimary: string;
  branchInactive: string;
  branchInactiveHint: string;
  branchRequired: string;
  noActiveBranches: string;
  required: string;
}

interface EmployeeBranchPickerProps {
  branches: Branch[];
  /** Ticked branch ids, in order. The first one is the employee's primary branch. */
  selectedIds: string[];
  /** Branches the employee already holds (edit mode). An inactive one stays listed so it is not silently dropped. */
  originalIds?: string[];
  onChange: (nextIds: string[]) => void;
  lang: "en" | "ar";
  labels: EmployeeBranchPickerLabels;
}

/**
 * Add / Edit Employee branch assignment: a checkbox list of ACTIVE branches (plus any inactive branch
 * the employee is already on). The first ticked branch is the primary branch, shown with a badge; any
 * other ticked branch gets a "Make primary" button. At least one branch must stay ticked, which the
 * form enforces on submit and this component flags inline.
 */
export default function EmployeeBranchPicker({
  branches,
  selectedIds,
  originalIds = [],
  onChange,
  lang,
  labels,
}: EmployeeBranchPickerProps) {
  const offered = branchesOfferedFor(branches, originalIds);
  const primaryId = selectedIds[0];

  return (
    <fieldset className="min-w-0" data-testid="employee-branch-picker">
      <legend className="block text-start text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand-secondary)] mb-1.5">
        {labels.assignedBranches} {labels.required}
      </legend>
      <p className="mb-2 text-start text-[11px] leading-relaxed text-[var(--color-brand-secondary)]">
        {labels.assignedBranchesHint}
      </p>

      {offered.length === 0 ? (
        <p role="alert" className="text-start text-xs font-semibold text-red-600">
          {labels.noActiveBranches}
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {offered.map((b) => {
            const checked = selectedIds.includes(b.id);
            const isPrimary = checked && b.id === primaryId;
            const isInactive = b.status !== "active";
            const name = (lang === "ar" ? b.name_ar || b.name_en : b.name_en || b.name_ar) || b.id;
            return (
              <li
                key={b.id}
                className={`flex min-h-[44px] items-center gap-2 rounded-2xl border px-3 py-1.5 transition ${
                  checked
                    ? "border-[var(--cr-primary)]/40 bg-[var(--cr-primary)]/5"
                    : "border-[var(--cr-primary)]/15 bg-[var(--color-brand-light)]"
                }`}
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-1">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange(toggleBranchSelection(selectedIds, b.id))}
                    className="h-5 w-5 shrink-0 rounded border-[var(--cr-primary)]/15 text-[var(--cr-primary)] focus:ring-[var(--cr-accent)] cursor-pointer"
                  />
                  <span className="min-w-0 flex-1 truncate text-start text-sm font-medium text-[var(--cr-dark)]">
                    {name}
                  </span>
                  {isInactive && (
                    <span
                      title={labels.branchInactiveHint}
                      className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800"
                    >
                      {labels.branchInactive}
                    </span>
                  )}
                  {isPrimary && (
                    <span className="shrink-0 rounded-full bg-[var(--cr-primary)] px-2 py-0.5 text-[10px] font-bold text-white">
                      {labels.branchPrimary}
                    </span>
                  )}
                </label>
                {checked && !isPrimary && (
                  <button
                    type="button"
                    onClick={() => onChange(makePrimaryBranch(selectedIds, b.id))}
                    className="shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-bold text-[var(--cr-primary)] underline-offset-2 hover:underline cursor-pointer"
                  >
                    {labels.branchMakePrimary}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {offered.length > 0 && selectedIds.length === 0 && (
        <p role="alert" className="mt-2 text-start text-xs font-semibold text-red-600">
          {labels.branchRequired}
        </p>
      )}
    </fieldset>
  );
}
