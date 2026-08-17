# Admin i18n Briefs 7-9 Gap-Closure Manual Test Checklist

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Context:** Briefs 7-9 (`ai_docs/WINDSURF_BRIEFS.md`) translated `MedicalFormModal.tsx`,
> `CustomerFormModal.tsx`, and `PatientsDirectoryView.tsx` into Arabic, but were reported complete
> while 3 specific items were still missing (see the ACTIVE BRIEF status note). This checklist
> covers the closure of those 3 items, plus 2 same-pattern items found and fixed in the same pass
> (the `pe-1` scrollbar padding in `MedicalFormModal.tsx`, and the Gender/Status/Referral
> filter-panel `<option>` labels in `PatientsDirectoryView.tsx`, which had translation keys already
> present in `translations.ts` but were never wired into the JSX).
>
> **Environment:** admin panel, `/admin`, language toggle available in the header. Use both `en`
> and `ar` for every check below.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### Gap 1 — CustomerFormModal.tsx Gender dropdown

- [ ] Open **Add Patient** (or edit an existing patient) in Arabic. Confirm the Gender dropdown shows `اختر الجنس` / `ذكر` / `أنثى` — not `Male / ذكر` / `Female / أنثى`.
- [ ] Switch to English on the same form. Confirm it shows plain `Select Gender` / `Male` / `Female`.
- [ ] Select "ذكر" (Male), save the patient. Confirm the saved record's `gender` field is `"Male"` (English, unchanged data shape) via the patient list or API response.

### Gap 2 — value/label separation (skin types, concerns, referral source)

- [ ] Open **Medical Intake Form** for a patient in Arabic. Confirm the 5 skin-type buttons read `عادية`/`جافة`/`دهنية`/`مختلطة`/`حساسة`, and the 7 concern buttons read their Arabic labels — not raw English.
- [ ] Select a skin type and 2-3 concerns, save. Confirm `medical_records.skin_type` and `main_concerns` are stored as the original English values (e.g. `"Oily"`, `"Acne & Blemishes"`) — not the Arabic display text.
- [ ] Switch to English on the same form. Confirm the buttons show plain English again with the same selections still checked.
- [ ] Open **Add/Edit Patient** in Arabic. Confirm the 8 Referral Source dropdown options are translated (فيسبوك / انستجرام / تيك توك / بحث جوجل / صديق - توصية شخصية / زيارة بدون موعد / الموقع الإلكتروني / أخرى).
- [ ] Select a referral source, save. Confirm the stored `referral` value is the original English string (e.g. `"Google Search"`), not the Arabic label.

### Gap 3 — PatientsDirectoryView.tsx RTL layout

- [ ] Open Patients Directory in Arabic. Confirm the whole page mirrors (page already had the `dir="rtl"` wrapper — this is about the elements inside it).
- [ ] Confirm the search bar's icon sits on the **right** edge of the input (not stuck on the left) and the input text doesn't overlap the icon.
- [ ] Confirm the table headers ("Customer" / "Created At" columns) are right-aligned, matching Arabic reading direction — not stuck reading left-aligned.
- [ ] Open the 3-dot "More Actions" menu (top right of the page) in Arabic. Confirm it opens anchored to the correct (start) side and its menu item text is right-aligned, not left-aligned floating on the wrong side.
- [ ] Click a row's action menu (per-patient 3-dot menu). Confirm it opens anchored correctly and "Edit Patient" / "View Profile" text is right-aligned.
- [ ] Switch back to English. Confirm all of the above revert to normal LTR positioning (search icon left, headers left-aligned, menus anchored right).

### Same-pattern fixes found in this pass (not in the original 3 gaps)

- [ ] In Arabic, open Medical Intake Form, scroll the form's internal scrollable area (the field list, not the whole modal). Confirm content doesn't crowd the scrollbar edge (was `pr-1`, now `pe-1` — logical padding, correct side in both directions).
- [ ] Open the Patients Directory filter panel (funnel icon) in Arabic. Confirm Gender filter shows `كل الأجناس`/`ذكر`/`أنثى`, Status filter shows `كل الحالات`/`النشط فقط`/`غير النشط فقط`, and Referral Source filter shows all 7 translated options (بحث جوجل / فيسبوك / انستجرام / صديق - عائلة / إحالة طبيب / زيارة بدون موعد / أخرى).
- [ ] Apply a filter (e.g. Gender = ذكر), confirm the patient list actually filters correctly (the `value=` attributes are unchanged English, so filtering logic should be unaffected by the label translation).
- [ ] Switch to English, confirm the filter panel reverts to English options with the same filter still applied.

### Regression check

- [ ] `npx tsc --noEmit` — clean (verified 2026-08-17, no errors).
- [ ] `npm run test` (vitest) — 107/107 passed (verified 2026-08-17).
- [ ] Spot check: no `Male / ذكر`-style cramped-bilingual strings remain anywhere in `src/components/admin/patients/` (`grep -rn "Male / ذكر"` returns nothing).
