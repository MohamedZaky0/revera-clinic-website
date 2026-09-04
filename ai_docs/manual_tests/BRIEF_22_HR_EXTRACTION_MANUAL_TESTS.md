# BRIEF 22 — Extract HR Admin Section (Manual Test Checklist)

**Scope:** Mechanical extraction of the HR admin section from `src/app/admin/page.tsx` into `src/components/admin/hr/AdminHrView.tsx`. No behavior change, no translation, no deduplication.

**Date:** 2026-08-22

---

## Evidence Log

| Step | Result | Notes |
|------|--------|-------|
| `npx tsc --noEmit` | PASS | 0 errors on `src/app/admin/page.tsx` and `src/components/admin/hr/AdminHrView.tsx`. |
| `npx eslint <touched files>` | PASS | 0 errors, 239 warnings (pre-existing unused-import/style warnings; no new errors). |
| `npm run build` | PASS | Next.js production build completed successfully. |
| `vitest run` | PASS | 618 passed / 9 expected fail, unchanged from baseline. |
| Browser: login + navigate to HR | PASS | Section renders with all 7 sub-tab buttons. |
| Browser: Payroll tab | PASS | Renders Payroll heading + Add Payroll button. |
| Browser: Doctor Payroll tab | PASS | Renders Doctor Payroll heading. |
| Browser: Targets tab + Edit Target modal | PASS | Edit Target button opens the detached modal; Save Target button present; no new runtime errors. |

---

## Gaps / Deviations from Brief 22

1. **HR-exclusive state kept in `page.tsx` as props**
   - The brief listed 27 HR-exclusive `useState` declarations to move into the new component. However, the corresponding fetch handlers (`fetchHrPayroll`, `fetchHrLeaves`, etc.) are defined in `page.tsx` and close over those setters; they were explicitly instructed to stay in `page.tsx` and be passed as props. Moving the state while keeping the handlers would break the closures.
   - To preserve behavior with zero code change, all HR state (`hrActiveSubTab`, payroll/leaves/performance/doctor-payroll/target states, etc.) remains in `page.tsx` and is passed down as props. The new component owns only the JSX and inline event handlers.
   - This is the same practical trade-off Brief 21 made for `viewingEmployee` and the shared Role Management state.

2. **Permission gating preserved exactly as-is**
   - The call site uses `{activeNav === "HR" && (<AdminHrView ... />)}` with no `adminRole` or `hasPermission` check, matching the original.

3. **Out-of-scope bugs intentionally not fixed**
   - Payroll status filter bug (Overdue/Pending both check `status === "Paid"`) left untouched.
   - Value/label-separation sites (leave status, payroll status, shift substring-matching, target/bonus type literals) left untouched.
   - Payroll and Doctor Payroll tabs not deduplicated.

---

## Pre-Deployment Checks

- [x] `src/components/admin/hr/AdminHrView.tsx` exists and exports default component.
- [x] `src/app/admin/page.tsx` imports and renders `<AdminHrView ... />` inside the `activeNav === "HR"` guard.
- [x] Main HR block (`10295-11862`) removed from `page.tsx`.
- [x] Detached Edit Target modal (`16190-16340`) removed from `page.tsx` and now lives inside `AdminHrView.tsx`.
- [x] Presence Activity Check overlay (`11865-11889`) and Location Warning modal (`11892-11917`) left untouched.
- [x] Permission gating unchanged (`activeNav === "HR"` only).
- [x] `tsc --noEmit` clean on touched files.
- [x] `eslint` clean on touched files (0 errors).
- [x] `npm run build` succeeds.
- [x] `vitest run` unchanged.

---

## Browser Verification Checklist

### 1. Overview
- [x] Click **overview** tab.
- [x] Workforce Directory card renders with employee count, approved leaves, total payroll.
- [x] Employee table renders with columns: Employee Info, Department, System Role, Branch, Base Salary.

### 2. Payroll
- [x] Click **payroll** tab.
- [x] Payroll heading + month selector + search + department/status filters render.
- [x] "Add Payroll" / "Run Payroll" button present.
- [ ] Run payroll; verify `POST /api/hr/payroll` is fired.
- [ ] Edit a bonus cell; verify `PATCH /api/hr/payroll` fires and local `payrollList` updates.
- [ ] Edit a deduction cell; verify `PATCH /api/hr/payroll` fires.
- [ ] Click "Mark as Paid"; verify `PATCH /api/hr/payroll` fires.
- [ ] Use search and filters.

### 3. Doctor Payroll
- [x] Click **Doctor Payroll** tab.
- [x] Doctor Payroll heading + month selector + search + status filters render.
- [ ] Run doctor payroll; verify `POST /api/hr/doctor-payroll`.
- [ ] Mark a row paid; verify `PATCH /api/hr/doctor-payroll`.

### 4. Leaves
- [x] Click **leaves** tab.
- [x] Leave list + submit form render.
- [ ] Submit a leave; verify `POST /api/hr/leaves`.
- [ ] Approve a leave; verify `PATCH /api/hr/leaves` (approve).
- [ ] Reject a leave; verify `PATCH /api/hr/leaves` (reject).

### 5. Performance
- [x] Click **performance** tab.
- [x] Review list + create form render.
- [ ] Create a review; verify `POST /api/hr/performance`.
- [ ] Delete a review; verify `DELETE /api/hr/performance`.

### 6. Attendance
- [x] Click **attendance** tab.
- [x] Attendance log renders.
- [ ] Resolve an inactivity alert; verify `PATCH /api/hr/alerts`.

### 7. Targets
- [x] Click **Targets** tab.
- [x] Target table renders with "Edit Target" buttons.
- [x] Click **Edit Target**; detached modal opens with "Set Monthly Target" heading, target amount, bonus percentage, target type, bonus type inputs.
- [ ] Save target; verify `PATCH /api/employees` fires and modal closes.
- [ ] Close modal via X; verify `editingTargetEmployee` clears.

### 8. Cross-section integration
- [x] HR → Payroll row "View Details" still routes to the Employees profile via shared `setViewingEmployee`.
- [x] `activeMissingAlerts` global banner still renders outside HR (not affected by extraction).
- [x] `fetchHrData()` orchestrator in `page.tsx` still auto-refreshes HR data when `activeNav === "HR"`.

---

## Commands Run

```powershell
# TypeScript
cmd /c "node_modules\.bin\tsc --noEmit"

# ESLint
cmd /c "node_modules\.bin\eslint src/app/admin/page.tsx src/components/admin/hr/AdminHrView.tsx"

# Production build
cmd /c "npm run build"

# Tests
cmd /c "node_modules\.bin\vitest run"
```

---

## Sign-off

- Mechanical extraction completed.
- Both HR spans (main block + detached Edit Target modal) moved into a single component.
- Build/TS/lint/tests verified.
- Core browser paths verified; remaining interactive API calls require normal manual QA but are not blocked by the extraction.

---

## Independent re-verification — 2026-08-22 (Mohamed's session)

Re-run rather than trusted, per standing project rule.

| Check | Result |
|---|---|
| `npx tsc --noEmit` (whole project) | PASS — 0 errors |
| `npx vitest run` (full suite) | PASS — 618 passed / 9 expected fail, unchanged from the pre-extraction baseline |
| Both spans moved | PASS — `page.tsx` retains only the `editingTargetEmployee` state declaration (`:954`) and the prop pass (`:10345`); the modal JSX itself is gone from `page.tsx` and present in `AdminHrView.tsx` |
| The two adjacent modals that must NOT move | PASS — `presenceModalOpen` / `locationWarningOpen` still in `page.tsx` (8 refs), untouched |
| Permission gate | PASS — still exactly `activeNav === "HR"` at `page.tsx:10296` with no role check, and **zero** `hasPermission`/`adminRole` occurrences inside `AdminHrView.tsx` — the looser-than-Employees gate was preserved, not "fixed" |
| Known Payroll filter bug preserved, not silently fixed | PASS — `AdminHrView.tsx:338-339` are still the two identical conditions, exactly as the brief instructed |
| Browser: HR loads, all 7 sub-tabs present | PASS — overview / payroll / Doctor Payroll / leaves / performance / attendance / Targets |
| Browser: **detached Edit Target modal** (highest-risk item) | PASS — Targets tab → Edit Target opens the modal with its inputs bound; this is the one thing that would have broken had the two spans been extracted independently |
| Console errors | 3 unrelated pre-existing 401s (`fetchCustomers`/`fetchRequests`/`fetchAllReservations`), identical to those seen during Brief 21 verification; nothing HR-specific |

**Verdict: PASS. Archived. Unblocks Brief 24 (HR translation).**
