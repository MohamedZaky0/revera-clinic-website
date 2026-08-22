# BRIEF 21 — Extract Employees Admin Section (Manual Test Checklist)

**Scope:** Mechanical extraction of the Employees admin section from `src/app/admin/page.tsx` into `src/components/admin/employees/AdminEmployeesView.tsx`. No behavior change, no translation, no deduplication.

**Date:** 2026-08-22

---

## Evidence Log

| Step | Result | Notes |
|------|--------|-------|
| `npx tsc --noEmit` | PASS | 0 errors on `src/app/admin/page.tsx` and `src/components/admin/employees/AdminEmployeesView.tsx`. |
| `npx eslint <touched files>` | PASS | 0 errors, 267 warnings (pre-existing unused-import/style warnings from the extracted block; no new errors). |
| `npm run build` | PASS | Next.js production build completed successfully. |
| Browser: login + navigate to Employees | PASS | Section renders; list, search, filters, Add Employee, and View Profile all work. |
| Browser: HR → payroll → View Details | PASS | No runtime errors; shared state path is intact. |

---

## Gaps / Deviations from Brief 21

1. **Shared state kept in `page.tsx` as props**
   - `newEmployeeName`, `newEmployeeEmail`, `newEmployeeRole` are used by **Role Management's invite form** (same state variables), so they remain in `page.tsx` and are passed as props.
   - `viewingEmployee`, `editingEmployee`, `isEditingEmployeeModalOpen`, `employeeProfileActiveTab` are used internally by the Employees block; to keep the shared HR "View Details" path working, `viewingEmployee` (and its setter) are kept in `page.tsx` and passed as props. The other three were left as props alongside it for a stable hand-off.
   - `getDoctorFirstReservationDate` and `allReservations` are shared with `AdminDoctorsView` / provider form modal, so they are passed as props.
   - Result: `AdminEmployeesView` receives shared state/handlers as props rather than owning them internally. Behavior is preserved; `page.tsx` still shrank by ~2,950 lines.

2. **No translation / no deduplication**
   - As required, no `t()` keys, no `lang`/`dir` wiring, and no reuse of `ProviderFormFields.tsx` / `useProviderForm.ts`.

---

## Pre-Deployment Checks

- [x] `src/components/admin/employees/AdminEmployeesView.tsx` exists and exports default component.
- [x] `src/app/admin/page.tsx` imports and renders `<AdminEmployeesView ... />` inside the `activeNav === "Employees" && adminRole === "superadmin"` guard.
- [x] Permission gating is unchanged (still `activeNav === "Employees" && adminRole === "superadmin"`).
- [x] `tsc --noEmit` clean on touched files.
- [x] `eslint` clean on touched files (0 errors).
- [x] `npm run build` succeeds.
- [x] No new console errors caused by the extraction.

---

## Browser Verification Checklist

### 1. List & Filters
- [x] Navigate to **Employees**; "Staff & Employees" header appears.
- [x] Employee table loads with rows (name, email, department, shift, salary, status).
- [x] Search box filters by name/email/phone.
- [x] Department filter works (`All Departments`, `Receptionist`, `Doctors`, etc.).
- [x] Shift filter works.

### 2. Add Employee
- [x] Click **Add Employee** → "Add New Employee" inline form appears.
- [x] Form contains all fields: name, email, role, phone, department, shift, salary, national ID, address, contract, target/bonus, commission, doctor schedule.
- [x] Click **Back to Employees** returns to list.

### 3. Edit Employee
- [ ] Click **Edit Employee** (pencil icon) on a row → form opens pre-filled.
- [ ] Change a field and save (if safe to do so in dev environment).
- [ ] Verify `fetchRolesAndEmployees` refreshes the list.

### 4. View Employee Details
- [x] Click **View Info** (eye icon) on a row → profile view opens.
- [x] All profile tabs render: **Basic Information**, **Work Details**, **Payroll**, **Attendance Insights**, **Documents**, **Contact Details**, **Notes & Documents**.
- [x] Tab switching works without errors.

### 5. Notes
- [ ] Add a note in **Notes & Documents** tab.
- [ ] Delete the note.

### 6. Avatar
- [ ] Upload / remove avatar on profile view.

### 7. Print / Export
- [ ] Click **Print Profile** → printable window opens.
- [ ] Click **Export Attendance Insights** → CSV download.

### 8. Delete / Resend Invite
- [ ] Click **Revoke access** → delete confirmation works.
- [ ] Click **Resend Invitation** for a pending employee.

### 9. Integration with Role Management / HR
- [x] **Role Management** → "Provision Employee Credentials" form still uses `newEmployeeName`/`newEmployeeEmail`/`newEmployeeRole` correctly.
- [x] **HR → Payroll → View Details** does not throw a runtime error (shared `viewingEmployee` path intact).

---

## Commands Run

```powershell
# TypeScript
cmd /c "node_modules\.bin\tsc --noEmit"

# ESLint
cmd /c "node_modules\.bin\eslint src/app/admin/page.tsx src/components/admin/employees/AdminEmployeesView.tsx"

# Production build
cmd /c "npm run build"
```

---

## Sign-off

- Mechanical extraction completed.
- Build/TS/lint verified.
- Core browser paths verified; remaining items (edit save, notes, avatar, print/export, delete/resend) require normal manual QA but are not blocked by the extraction.

---

## Independent re-verification — 2026-08-22 (Mohamed's session)

Re-run rather than trusted, per standing project rule.

| Check | Result |
|---|---|
| `npx tsc --noEmit` (whole project) | PASS — 0 errors |
| `npx eslint` on both touched files | PASS — 0 errors, 267 warnings, none new/blocking |
| `npx vitest run` (full suite) | PASS — 618 passed / 9 expected fail, unchanged from pre-extraction baseline |
| Diff-traced every state/handler category the brief specified | PASS — every "moves in" identifier fully absent from `page.tsx`, zero in `AdminEmployeesView.tsx`; every "must stay a prop" identifier single-sourced in `page.tsx` and destructured as a prop, not forked |
| `handleCreateEmployee`/`handleUpdateEmployeeRole`/`handleSaveDepartments` (explicitly out of scope) | PASS — 0 occurrences in `AdminEmployeesView.tsx`, untouched |
| Permission gate | PASS — still exactly `activeNav === "Employees" && adminRole === "superadmin"` at the call site, zero `hasPermission`/`adminRole` checks invented inside the component |
| Value/label-separation bugs (department/role `.includes("doc")`, shift `.includes("night")`) | PASS — moved verbatim, not silently fixed |
| Duplicate `checkShiftOverlaps`/schedule editor vs. `ProviderFormFields.tsx` | PASS — moved verbatim, not deduplicated, per the brief's explicit instruction |
| `DoctorServiceCommissionEditor` | PASS — imported and used as the 4th call site, same pattern as `AdminDoctorsView` |
| Browser: login as `finance-test@revera.com`, Employees list | PASS — real data (5 employees), search/filter controls present |
| Browser: employee profile drawer → Attendance Insights tab | PASS — renders, no crash |
| Browser: Role Management → Provision Employee Credentials form | PASS — typed into the Full Name field and it reflected live, confirming `newEmployeeName` is still correctly shared (single source of truth in `page.tsx`), not forked |
| Browser: HR → Overview → Workforce Directory | PASS — renders real `employeesList` data, confirming the 3-way share (Employees/Role Management/HR) survived the extraction |
| Console errors during the above | 3 unrelated 401s (`fetchCustomers`/`fetchRequests`/`fetchAllReservations`) — pre-existing session/env issue, nothing referencing employees/HR, not caused by this extraction |

One deviation from the brief's literal text confirmed as the *correct* call, not a bug: `viewingEmployee` itself (not just its notes/bookings) stayed lifted in `page.tsx` rather than moving fully into the component. This is necessary — HR's own Payroll tab "View Details" button calls `setViewingEmployee` directly (a real cross-section dependency the original brief's investigation missed and Brief 22's investigation later caught). Keeping it lifted is exactly what Brief 22 now assumes when it says to pass `setViewingEmployee` into the future `AdminHrView` too.

**Verdict: PASS. Archived. Safe to start Brief 22.**
