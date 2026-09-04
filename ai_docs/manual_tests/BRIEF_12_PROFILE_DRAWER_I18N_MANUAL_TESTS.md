# Brief 12 — Customer Profile Drawer Arabic i18n Manual Test Checklist

> **Living document.** Update with dated dev evidence as each check is run.
> **Context:** Brief 12 (`ai_docs/WINDSURF_BRIEFS.md`) translated
> `src/components/admin/patients/CustomerProfileDrawer.tsx` (1,539 lines — 5 tabs + 3 inline
> modals) into Arabic, adding a `patients.customerProfileDrawer` namespace to
> `src/components/admin/translations.ts`.
>
> **Environment:** admin panel → Patients → click any patient row. Language toggle is in the
> sidebar header. Run every check in **both** `en` and `ar`.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-08-19 | Tabs 1-5 + Add Product / Sell Package modals render fully Arabic | localhost:3000, patient "saif zaki" | Accessibility-tree read in `ar`: tabs render `المعلومات الشخصية` / `سجل الحجوزات` / `الوصفات والسجلات` / `المنتجات المشتراة والسلة` / `الباقات المشتراة`; no raw English copy | Pass |
| 2026-08-19 | Booking-status value/label separation | same | Status column displays `مكتمل` while the record's stored status remains `completed` (shown as `completed` in `en` mode on the same row) | Pass |
| 2026-08-19 | Payment-method value/label separation | Sell Package modal, `ar` | `<option value="cash">نقدي</option>`, `card`/`wallet`/`instapay`/`transfer` all keep English values with Arabic labels | Pass |
| 2026-08-19 | Skin-type lookup reuse | Prescriptions & Records, `ar` | Stored `Oily` renders as `دهنية` | Pass |
| 2026-08-19 | Dates/money stay Western (DEC-043) | Booking History, `ar` | `18 Aug 2026`, `13:00`, `2360 EGP` — Western digits, English month names, unchanged from `en` | Pass |
| 2026-08-19 | Clean revert to English | same | Toggling back to `en` restores all English labels; no stuck Arabic | Pass |
| | Package-status badge (`packageStatusLabels`) | | **Not yet exercised live** — needs a patient with a non-`active` package; see note below | Pending |

## Per-check list

### Tabs and modals — run in both `en` and `ar`

- [ ] Personal Info: all field labels translated (phone, email, age, gender, national ID, referral source, occupation, city, street, building).
- [ ] Booking History: column headers translated; date/slot, service name, provider name, money values unchanged.
- [ ] Prescriptions & Records: all 3 sub-tabs translated (Medical Intake / Clinical Prescriptions / Reports & Documents); "Write Prescription" form opens with translated labels and all 5 placeholders in Arabic.
- [ ] Purchased Products & Cart: both sub-tabs (Active Balances / Purchase History) translated; empty-state copy translated.
- [ ] Purchased Packages: both sub-tabs (Active Packages / History) translated; empty-state copy translated.
- [ ] **Log Usage modal** — needs a patient with an active product balance. Confirm title, quantity field, notes placeholder, and both buttons are Arabic.
- [ ] Add Product to Patient modal: title, product dropdown, qty/price fields, custom-item option, both buttons Arabic.
- [ ] Sell Package modal: package dropdown, payment-method dropdown, both buttons Arabic.

### Value/label separation — the thing Briefs 7-8 got wrong

- [ ] Booking status badges show Arabic labels but the underlying record keeps English (`confirmed` / `completed` / `cancelled` / `checked_in` / `in_progress` / `postponed` / `pending`). Verify by switching to `en` on the same row.
- [ ] Payment method: pick a non-default method in Arabic, sell a package, confirm the stored `payments.method` is the English value (`card`, not `بطاقة`).
- [ ] Skin type / concerns in the intake display keep English stored values.
- [ ] **Package status badge (History sub-tab):** needs a patient with an expired/used-up package. Confirm the badge shows the Arabic label and that an *unknown* status still degrades gracefully to the raw value rather than rendering blank.

### RTL layout

- [ ] In Arabic the drawer mirrors: tab row, table headers, and the money columns (`text-end`) sit on the correct side.
- [ ] The two `end-1` positioned elements (modal close buttons) sit on the correct corner in both directions.
- [ ] Switch back to English and confirm everything mirrors back — nothing stuck on the wrong side.

### Dates and numbers — must NOT change (DEC-043)

- [ ] Every date in the drawer still reads as an English month with Western digits in Arabic mode (e.g. `18 Aug 2026`, not `١٨ أغسطس ٢٠٢٦`).
- [ ] Money values use Western digits in both languages.

### Regression check

- [ ] `npx tsc --noEmit` — clean (verified 2026-08-19, 0 errors).
- [ ] `npm run test` — 597 passed, 6 expected fail (verified 2026-08-19, matches pre-Brief-12 baseline).
- [ ] `npx eslint` on the two touched files — 0 errors (verified 2026-08-19; 1 pre-existing `<img>` warning).
- [ ] `grep -c '>[A-Z][a-z]'` on `CustomerProfileDrawer.tsx` returns 0 (verified 2026-08-19).
- [ ] en/ar translation key parity — 345 keys each, no key present in one block and missing from the other (verified 2026-08-19 by script).
