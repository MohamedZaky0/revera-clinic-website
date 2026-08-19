# Brief 18 — Doctors Dedup (Part 0) + Arabic Translation (Part 1) Manual Test Checklist

> **Living document.** Update with dated dev evidence as each check is run.
> **Context:** Brief 18 (`ai_docs/WINDSURF_BRIEFS.md`) had two parts. Part 0 extracted the
> ~390-line shared provider-form body — duplicated byte-for-byte between
> `AdminDoctorsView.tsx`'s inline edit view and `ProviderFormModal.tsx`'s Add modal — into one
> `ProviderFormFields.tsx`, consumed by both. Part 1 translated the whole ecosystem (4 files) to
> Arabic, now touching only 2 Gender value/label-separation sites instead of 3 thanks to Part 0.
>
> **Environment:** admin panel → Doctors. Language toggle in the sidebar header.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-08-20 | Part 0: both surfaces render identically post-dedup | localhost:3000, English | Doctors list, Edit Doctor inline view (all fields incl. commission/schedule), Add Doctor modal all confirmed rendering via code + live browser check | Pass |
| 2026-08-20 | Gender reduced from 3 sites to 2 | Code review | `value="Male"/"Female"` found only in `ProviderFormFields.tsx` (shared) and `AdminDoctorsView.tsx`'s filter panel (genuinely separate) — confirmed by grep | Pass |
| 2026-08-20 | Session Type reduced from 2 duplicate sites to 1 | Code review | `providerFormScheduleTab` toggle now only in `ProviderFormFields.tsx` | Pass |
| 2026-08-20 | `toLocaleString()` bug fixed | Code review | `DoctorAuditLogsModal.tsx:113` now `toLocaleString("en-GB")`, was unpinned | Pass |
| 2026-08-20 | Full Arabic translation, live | localhost:3000, Arabic | Doctors list ("الأطباء"), Edit Doctor form fully translated including Gender ("الجنس"/"ذكر"/"أنثى"), Session Type ("بالعيادة"/"أونلاين"), day names (see gap below) | Pass (after fix) |
| 2026-08-20 | RTL mirroring on full Edit Doctor form | localhost:3000, Arabic | Screenshot: every label/field correctly right-aligned and mirrored | Pass |
| 2026-08-20 | Clean revert to English | localhost:3000 | Toggled back, all labels reverted correctly | Pass |
| 2026-08-20 | en/ar key parity | Code review | 477/477 keys, no one-sided keys, checked against the commit as authored (not the dirty tree, which had Brief 19 WIP mixed in) | Pass |
| 2026-08-20 | `tsc`/`eslint`/`vitest` | | 0 errors, 0 new warnings, 597/603 tests (baseline unchanged) | Pass |

## Gaps found during verification, both fixed before archiving

- **RTL class**: `AdminDoctorsView.tsx`'s row-actions dropdown wrapper (`text-left`, line 326)
  wasn't converted, unlike its own inner menu which correctly used `text-start`. Likely visually
  inert (icon-only button, no text content) but fixed anyway to match the brief's stated bar.
- **Day names**: `ProviderFormFields.tsx`'s working-schedule day labels rendered
  `Object.keys(activeSched)` directly (`{day}`) with no translation lookup — so "Sunday" through
  "Saturday" stayed English even in Arabic mode. Not caught by `grep '>[A-Z][a-z]'` (an interpolated
  expression, not literal JSX text) — found by reading the actual Arabic render. Fixed by adding a
  `dayNames` lookup to `providerFormFields` (both `en`/`ar`) with a raw-key fallback; the
  `activeSched[day]`/`setActiveSched` calls correctly still use the untranslated `day` as the data
  key — only the *displayed* label goes through the lookup.

## Per-check list

### Part 0 — behaviour identical to before, just deduplicated

- [x] Edit an existing doctor via the inline view (`AdminDoctorsView.tsx`) — form pre-fills
      correctly, all fields present.
- [ ] Save an edit and confirm it persists (screenshot check only, not saved this pass).
- [ ] Add a new doctor via the modal (`ProviderFormModal.tsx`) — same field set, saves correctly.
- [x] `DoctorServiceCommissionEditor` (already-extracted, shared, untouched) still renders
      correctly inside both the inline view and the modal.

### Part 1 — Arabic translation

- [x] Doctors list header, table columns, "+N More" pill, "Actions" menu all translate.
- [x] Edit Doctor form: every label, Gender dropdown, Session Type toggle, all 7 day names,
      placeholders all translate.
- [ ] Add Doctor modal — not re-verified live this pass (Part 0's dedup makes this the same
      component as the inline view; low risk, but not independently screenshotted in Arabic).
- [x] Audit Logs modal — English confirmed working with real data (see Brief 17 checklist); Arabic
      rendering not re-checked this pass since Brief 18 targets a different concern (Gender/Session
      Type/day names) — low risk, same translation mechanism as everywhere else.
- [x] Filter-panel Gender dropdown (separate from the edit-form one) confirmed still uses
      `t.genderMale`/`t.genderFemale`.
- [x] `DoctorServiceCommissionEditor`'s own English text (Commission Type, Fixed/Percentage, etc.)
      correctly left untranslated — it's a separate, cross-cutting shared component (also used by
      Services and doctor payroll), explicitly out of Brief 18's scope per the brief itself.

### Regression

- [x] `npx tsc --noEmit` — clean.
- [x] `npm run test` — 597/603, unchanged baseline.
- [x] `npx eslint` on all 4 touched files — 0 errors.
