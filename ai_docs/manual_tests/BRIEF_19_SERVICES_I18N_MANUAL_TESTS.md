# Brief 19 — Services Arabic Translation Manual Test Checklist

> **Living document.** Update with dated dev evidence as each check is run.
> **Context:** Brief 19 (`ai_docs/WINDSURF_BRIEFS.md`) translated
> `src/components/admin/services/AdminServicesView.tsx` (1,171 lines) into Arabic.
>
> **Environment:** admin panel → Services. Language toggle in the sidebar header.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-08-20 | Full visual/content review in the browser | localhost:3000, both languages | Mohamed reviewed the live translation directly and confirmed it reads correctly | Pass |
| 2026-08-20 | `tsc`/`eslint`/`vitest` | | 0 type errors, 0 new lint errors (pre-existing unused-var warnings unrelated to translation, see RISK-064 area), 597/603 tests unchanged | Pass |
| 2026-08-20 | Status value/label separation | Code review | `<option value="Active">{t.activeOnly}</option>` / `value="Inactive"` — stored values stay canonical English, only the label translates | Pass |
| 2026-08-20 | `dir` attribute present | Code review | 3 occurrences: 1 on the component root, 2 pre-existing hardcoded `dir="rtl"` on the Arabic Service Name / Arabic Description text inputs (content-direction hints, not the language toggle — correctly left alone) | Pass |
| 2026-08-20 | en/ar key parity | Code review | 567/567 keys, no one-sided keys, across the full `translations.ts` | Pass |

## Found, not caused, by this brief — pre-existing, low severity

- Branch-pricing table cell has 2 small hardcoded strings: `"Def"` (default-branch-price badge,
  appears twice) and a hardcoded `"Zayed:"` fallback label used only when `svc.branchPricing` isn't
  an array (a data-shape fallback, not typical UI copy). Confirmed via diff against the
  pre-Brief-19 commit (`07c11fd`) that both already existed before this brief touched the file —
  not a regression, not introduced here. Low impact (an abbreviation and a rarely-hit fallback
  path); worth a follow-up pass whenever someone next touches this table, not blocking.

## Per-check list

- [x] Services list, category grouping, "Add Category"/"Add Service" buttons, sort dropdown all
      translate (confirmed by Mohamed directly in the browser).
- [x] Add/Edit Service form (name EN/AR, description EN/AR, category, duration, price) translates,
      Arabic-content inputs correctly stay RTL regardless of admin language.
- [x] Active/Inactive status filter and badges translate; stored `status` values stay English.
- [ ] Add Category modal — not specifically re-checked against the still-open RISK-064 gap
      (missing Arabic name field) in this pass; that gap is tracked separately and wasn't in Brief
      19's scope to fix.

### Regression

- [x] `npx tsc --noEmit` — clean.
- [x] `npm run test` — 597/603, unchanged baseline.
- [x] `npx eslint` on `AdminServicesView.tsx` — 0 errors.
