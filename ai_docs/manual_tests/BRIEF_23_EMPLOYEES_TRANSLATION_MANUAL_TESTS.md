# Brief 23 — Employees Admin View Translation Manual Tests

## Scope
Translate the `AdminEmployeesView.tsx` component to Arabic while keeping English working. Verify `lang`/`t` props, RTL rendering, locale pinning, and no hardcoded English UI strings.

## Preconditions
- Log in to admin with test superadmin.
- Navigate to `/admin` and open the **Employees** section.
- Have at least one employee and one doctor in the list.

## Verification Steps

### 1. English Rendering
- [ ] Page heading shows "Employees & Staff".
- [ ] Subtitle renders in English.
- [ ] "Add Employee" button label is English.
- [ ] Table headers: Employee Info, Phone, Department, Branch, Shift, Salary, Status, Actions.
- [ ] Status badges show "Active" / "Invited".
- [ ] Filter placeholders are English.
- [ ] Modal titles: "Add New Employee", "Edit Employee".
- [ ] Form labels: Full Name, Email Address, Phone Number, System Role, Assigned Branch, Department, Salary.
- [ ] Doctor section title: "Doctor & Medical Configuration".
- [ ] Profile tabs: Basic Info, Work Details, Payroll, Target & Performance, Attendance Insights, Contact Details, Notes & Documents.
- [ ] Print profile and CSV export use English labels.

### 2. Arabic Rendering
- [ ] Switch language to Arabic.
- [ ] Page heading shows "الموظفين والطاقم".
- [ ] All labels, buttons, badges, and placeholders translate to Arabic.
- [ ] Modal title shows "إضافة موظف جديد" / "تعديل موظف".
- [ ] Form labels are Arabic.
- [ ] Doctor section title is Arabic.
- [ ] Profile tabs are Arabic.
- [ ] Print profile and CSV export labels are Arabic.
- [ ] No visible English strings remain in the translated component.

### 3. RTL Layout
- [ ] Root container has `dir="rtl"` when `lang === "ar"`.
- [ ] Table columns reverse visually in Arabic.
- [ ] Text alignment uses `text-start` / `text-end` (no hardcoded `text-left`/`text-right`).
- [ ] Modal close and action buttons mirror appropriately.
- [ ] Inputs and selects render correctly in RTL.

### 4. Locale Pinning
- [ ] `toLocaleString`, `toLocaleDateString`, and `toLocaleTimeString` calls use `"en-US"`.
- [ ] Salary values format consistently regardless of selected language.
- [ ] Dates in attendance CSV export format consistently.
- [ ] No runtime locale errors in console.

### 5. Translation Keys Coverage
- [ ] `t.heading`, `t.subtitle`, `t.addEmployeeBtn` render correctly.
- [ ] `t.table.*` keys cover all table headers and fallbacks.
- [ ] `t.actions.*` keys cover view, edit, resend, revoke.
- [ ] `t.modal.*` keys cover titles, subtitles, buttons.
- [ ] `t.form.*` keys cover labels, placeholders, alerts.
- [ ] `t.doctorSection.*` keys cover schedule, shift types, overlap warnings.
- [ ] `t.nationalId.*` and `t.address.*` keys cover ID/address form.
- [ ] `t.profile.*`, `t.printProfile.*`, and `t.csvExport.*` keys cover profile/print/export.

### 6. Shift Overlap Warnings
- [ ] Enter overlapping shifts for a doctor.
- [ ] Overlap warning displays in the selected language with correct day/branch/type placeholders.
- [ ] Invalid shift duration warning displays in the selected language.

### 7. Add / Edit Employee Flow
- [ ] Open add employee modal in English; all fields are labeled in English.
- [ ] Save an employee in English; success/error alerts are in English.
- [ ] Switch to Arabic; open edit employee modal; labels and alerts are in Arabic.
- [ ] Upload national ID front/back; upload hints translate.

### 8. Profile / Print / CSV
- [ ] View an employee profile; all sections translate.
- [ ] Click "Print Profile"; print preview uses translated labels.
- [ ] Click "Download Attendance"; CSV headers translate.

### 9. Type / Build Checks
- [ ] Run `npx tsc --noEmit` — 0 errors.
- [ ] Run `npx eslint src/components/admin/employees/AdminEmployeesView.tsx src/components/admin/translations.ts src/app/admin/page.tsx` — 0 errors (warnings acceptable if pre-existing).
- [ ] Run `npm run build` — completes without errors.

## Evidence Log
- Screenshot: Employees list in Arabic.
- Screenshot: Add/Edit employee modal in Arabic.
- Screenshot: Doctor schedule section in Arabic.
- Screenshot: Employee profile in Arabic.
- Screenshot: Print preview in Arabic.
- Screenshot: CSV export headers in Arabic.
- Console: no locale or translation errors.

## Gaps / Deviations
- None identified.

## Sign-off
- [ ] Arabic translation verified visually.
- [ ] RTL layout verified.
- [ ] Locale pinning verified.
- [ ] No English strings remain in component output.

---

## Independent re-verification — 2026-08-22, after the review-gap fix commit (`3efe21f`)

First submission was reviewed and **not accepted** — see the `## Brief 23` entry in
`WINDSURF_BRIEFS.md` for the exact gap list (live "View Employee Details" drawer's Basic Info and
Work tabs were never wired to already-existing translation keys; the `emp.shift` raw-value bug the
brief explicitly asked to fix was still present at 3 sites). Re-verified after the fix commit,
independently, per standing project rule:

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS — 0 errors |
| `npx eslint` on all 4 touched files | PASS — 0 errors, 274 warnings, same count as before the fix (no new ones) |
| `npx vitest run` (full suite) | PASS — 618/9, unchanged |
| en/ar key parity (`employees` + `hr` namespaces) | PASS — verified by evaluating `adminTranslations` at runtime, not grepped (a grep-based parity check gives false positives on any key whose value is a function) |
| Raw JSX text sweep (`grep '>[A-Z][a-zA-Z ]\{2,40\}<'`) | PASS — only `"Revera Clinic Cairo"` remains, which is intentionally excluded (CLAUDE.md hard-rule-2 hardcoded-client-value issue, not a translation gap) |
| `emp.shift`/`viewingEmployee.shift` — all display sites re-traced | PASS — table badge (was line 1074), print (was line 722), and profile Work tab (was line 2517) now all route through a new `t.profile.shiftLabel(shift)` function; all comparison sites (`=== "Night"`, `.includes("night")`, filter logic) still compare the raw canonical value, untouched |
| `shiftLabel()` behavior, both languages | PASS — `en`: "Night"→"Night Shift", unrecognized value passes through unchanged. `ar`: real Arabic strings ("شفت ليلي"/"شفت نهاري"), same pass-through fallback for unrecognized values |
| Work tab exact-match ternary (the brief's "4th instance") | PASS — now reuses `t.doctorSection.shiftTypeDetails(...)`, `nightHours`/`dayHours`, `nightBreak`/`dayBreak` — same functions the print template already used correctly |
| Browser: Employees list table, English → Arabic | PASS — shift badge shows "شفت نهاري"/"شفت ليلي"; one row with a genuinely custom shift value ("10:00 AM to 05:00 PM") correctly falls through the label function unchanged in both languages — confirms the fallback design works, not a bug |
| Browser: profile drawer, Work tab, Arabic | PASS — "نوع الشفت" / "شفت نهاري", "تفاصيل الشفت" / "شفت نهاري عام", working hours/break time with Arabic AM/PM markers (ص/م) |
| Browser: profile drawer, Basic Info tab, Arabic | PASS — رقم الموظف / الاسم الكامل / البريد الإلكتروني / رقم الهاتف / دور النظام / الرقم القومي / تاريخ الميلاد والعمر / حالة الحساب / تاريخ الإضافة all render translated |

**Verdict: PASS. Accepted.**
