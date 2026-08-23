# Brief 25 — Role Management: Extract, Translate, Test

## Scope
Three ordered parts, three commits, per Brief 25's own requirement:
1. Extract `activeNav === "Role Management"` from `page.tsx` into
   `src/components/admin/settings/RoleManagementView.tsx` — zero behavior change.
2. Translate the new component to Arabic — new `roleManagement` namespace, including a
   `key → label` map built from `PERMISSION_STRUCTURE` for the 69 permission/category strings.
3. Route-level tests for the two permission-critical endpoints this section drives.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-08-23 | `npx tsc --noEmit` (whole project) | CLI | 0 errors | PASS |
| 2026-08-23 | `npx eslint` on `page.tsx`, `RoleManagementView.tsx`, the new test file | CLI | 0 errors, 219 warnings, all pre-existing | PASS |
| 2026-08-23 | `npx vitest run` (full suite) | CLI | 624 passed / 11 expected fail — +7 vs. pre-Brief-25 baseline (5 new passing + 2 new `it.fails`, matches Part 3's own count) | PASS |
| 2026-08-23 | Permission gate unchanged | Code review | `activeNav === "Role Management" && adminRole === "superadmin"` still the only gate at the call site; zero `hasPermission` calls inside the component | PASS |
| 2026-08-23 | Known 3-layer permission-mismatch defect preserved, not silently fixed | Code review | `"Role Management": "settings.roles"` still present at all 3 original sites (sidebar, 2 nav-guard maps) | PASS |
| 2026-08-23 | State placement (move-in vs. stay-as-prop) | grep both files for every identifier the brief named | Every "moves in" identifier (`newRoleName`, `newRolePermissions`, `roleCreateError`, `roleCreateSuccess`, the non-contiguous `newDeptInput`, `handleCreateEmployee`, `handleUpdateEmployeeRole`, `handleSaveDepartments`) is 0 in `page.tsx`; every "stays a prop" identifier (`departmentsList`, `employeesList`, `rolesList`, `newEmployeeName`) is single-sourced in `page.tsx` and destructured as a prop | PASS |
| 2026-08-23 | `PERMISSION_STRUCTURE` key→label map | Code review | `permissionKeyToLabel` (`useMemo`, keyed on `[t]`) maps every `item.key` to `t.permissionLabels[key] \|\| item.key`; used at the roles table's chip render as `permissionKeyToLabel[p] \|\| p` — canonical `p` stays the React key and the stored comparison value | PASS |
| 2026-08-23 | Category labels | Code review | `t.permissionCategories[group.category] \|\| group.category`, same pattern | PASS |
| 2026-08-23 | Protected-department guard preserved canonical | Code review | `dept !== "Doctors" && dept !== "Receptionist"` unchanged, untranslated | PASS |
| 2026-08-23 | RTL — no physical properties remain | grep `text-left\|text-right\|ml-1\|mr-1` | Zero matches in the new component | PASS |
| 2026-08-23 | `dir` wiring | Code review | Exactly one `dir={lang==="ar"?"rtl":"ltr"}`, on the component's own root | PASS |
| 2026-08-23 | Browser: Arabic | localhost:3000, Settings → Role Management | All 12 permission categories and their items render translated; role names (`Admin`/`Rec`/`Superadmin`) correctly stay untranslated (free text) | PASS |
| 2026-08-23 | Browser: English | Same page, language toggle | Renders identically to the original English strings | PASS |
| 2026-08-23 | RISK-069 (privilege escalation) independently re-verified | Read `PATCH /api/employees` + `requireAdministratorAccess` directly | Confirmed real: `requireAdministratorAccess` admits `admin` OR `superadmin`; the only role-change guard checks the *target's* `employee_id`, never the caller's role | CONFIRMED, not fixed (out of this brief's scope by design) |

## Found during review, not caused by this brief

**RISK-070** (logged in `RISKS.md`): the `Admin`/`Receptionist`/`Superadmin` roles' "Allowed
Modules" chips show some untranslated raw category words (`Bookings`, `Customers`...) instead of
translated permission labels. Root cause is pre-existing data — those roles' `permissions` arrays
contain coarse undotted strings instead of the granular dotted keys `PERMISSION_STRUCTURE` defines,
so `permissionKeyToLabel`'s documented fallback (pass an unrecognized value through unchanged)
correctly fires. The `Rec` role, whose permissions are properly granular, renders every chip
translated. Not a defect in this brief's code.

## Sign-off

- [x] Part 1 (extraction), Part 2 (translation), Part 3 (tests) landed as 3 separate, correctly
      labeled commits (`7a85428`, `a1d2487`, `e979732`).
- [x] `tsc`/`eslint`/`vitest` clean.
- [x] Every state/handler placement individually verified against the brief.
- [x] Live browser verification, both languages.
- [x] RISK-069 (found by this brief's own Part 3) independently re-verified as a real, reproducible
      vulnerability — logged, not fixed, per the brief's explicit scope boundary.
- [x] RISK-070 (found during this review) logged as a separate, pre-existing, low-severity issue.

**Verdict: PASS. Accepted.**
