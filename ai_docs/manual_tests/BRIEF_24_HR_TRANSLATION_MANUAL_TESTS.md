# Brief 24 — HR Admin View Translation Manual Tests

## Scope
Translate `AdminHrView.tsx` (7 sub-tabs: Overview, Payroll, Doctor Payroll, Leaves, Performance,
Attendance, Targets, plus the physically-detached Edit Target modal) to Arabic.

## Review history
First submission (commit landing Brief 24's `t`/`lang` wiring) was reviewed and found nearly
complete, with one contained gap — see the `## Brief 24` entry in `WINDSURF_BRIEFS.md`: the
Payroll tab's department filter dropdown had 5 hardcoded English `<option>` labels
(`Doctors`/`Nursing`/`Admin`/`Reception`/`Lab`). Fixed in the same commit as Brief 23's fixes
(`3efe21f`).

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-08-22 | `npx tsc --noEmit` | CLI | 0 errors | PASS |
| 2026-08-22 | `npx eslint` on all touched files | CLI | 0 errors, 274 warnings (same count pre/post fix, none new) | PASS |
| 2026-08-22 | `npx vitest run` (full suite) | CLI | 618 passed / 9 expected fail, unchanged | PASS |
| 2026-08-22 | en/ar key parity (`hr` namespace) | Runtime evaluation of `adminTranslations`, not grep | Full match, both directions | PASS |
| 2026-08-22 | `dir={lang==="ar"?"rtl":"ltr"}` present on both the component root AND the detached Edit Target modal (~line 1756, not DOM-nested under the root so needs its own) | Code review | Both present | PASS |
| 2026-08-22 | Payroll department filter — `value=` stays canonical, label translates | Code review + browser | `<option value="Doctors">{t.payroll.deptDoctors}</option>` etc.; browser confirms `value` attributes unchanged (`Doctors`/`Nursing`/`Admin`/`Reception`/`Lab`) while visible text reads أطباء/تمريض/إدارة/استقبال/معمل in Arabic | PASS |

## Sign-off
- [x] `tsc`/`eslint`/`vitest` clean.
- [x] en/ar key parity confirmed at runtime.
- [x] `dir` wiring correct on both the root and the detached modal.
- [x] Department filter dropdown fully translated, filter values unaffected.

**Verdict: PASS. Accepted.**
