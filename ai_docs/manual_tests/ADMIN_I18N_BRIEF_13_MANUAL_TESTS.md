# Brief 13 Manual Test Checklist — `AdminBookingsView.tsx` Arabic translation

Target: `src/components/admin/bookings/AdminBookingsView.tsx`. Wiring added: `lang`/`t` props,
new `bookings.adminBookingsView` namespace in `src/components/admin/translations.ts`, passed from
`src/app/admin/page.tsx`'s single render site (`activeNav === "Bookings"`, `!showFullViewNewBooking`).

Login: `finance-test@revera.com` / `ReveraTest1!` at `localhost:3000/admin`.

## Independent verification evidence (2026-08-19, separate from the report above)

| Check | Evidence | Result |
|---|---|---|
| Section 2, no raw English leaking | Full page-text dump in `ar` mode: header, 5 stat cards, calendar legend (all 8 status labels), table headers, and the one live row (`مؤكد` status, `مدفوع جزئياً` payment) all Arabic | Pass |
| Section 2, dates stay `en-GB`/`en-US` | Same dump: `August 2026`, `Wednesday, 19 August 2026`, `09:00 AM` all rendered unchanged in `ar` mode | Pass |
| Clean revert to English | Same page, toggled back to `en`: header/cards/table/badges all reverted, `Confirmed`/`Partially Paid` on the same row | Pass |
| Value/label separation (static code check, not live-clicked) | `getStatusConfig()`/`getPaymentStyle()` switch on the raw canonical value and return only the label from `tr.statusLabels`/`tr.paymentStatusLabels`; verified via `grep` that every `"confirmed"`/`"checked_in"`/etc. comparison and the two `supabase.update({status:...})` call sites are untouched English literals | Pass |
| en/ar key parity | Full-file key diff against the commit as authored: 345/345, no one-sided keys | Pass |
| `tsc --noEmit` | Re-run independently | 0 errors |
| `eslint` on touched files | Re-run independently | 0 errors, pre-existing-pattern warnings only |
| `npm run test` | Re-run independently | 597 passed, 6 expected fail (unchanged baseline) |

Section 3's live Approve/Reject-then-inspect-the-record checks were not re-clicked in this pass —
covered instead by the static grep confirmation above that the comparison/write-site values are
untouched literals, which is the same guarantee those checks are after.


## 1. English baseline (sanity — should be unchanged from before this brief)
- [ ] Navigate to **Bookings**. Header greeting reads "Good morning, {name}" + subtitle.
- [ ] 5 analytics cards read: Today's Appointments, Upcoming, Completed, Canceled, Postponed —
      each with correct "Next: HH:MM AM/PM", "Today onward", "This month" sub-labels.
- [ ] Toggle "Pending" / "Calendar View" — both switch views correctly, badge count on Pending shows.
- [ ] "New Booking" button opens the full new-booking view.
- [ ] 3-dot "More options" menu → "Print Schedule" and "Export CSV" both present and clickable.
- [ ] If any session is stuck `in_progress` past the stale threshold, the red "Needs Attention" panel
      appears with correct singular/plural ("1 session" vs "N sessions") and the hour count.
- [ ] Switch to Pending view: table headers (Patient, Service, Doctor, Date & Time, Branch, Status,
      Requested At, Actions), "No pending approval requests." empty state, Approve/Reject icon
      buttons and their tooltips, the "⋮" More Actions dropdown (View Details / Approve Booking /
      Reject Booking), and the "Showing X to Y of Z pending approvals" pagination footer.
- [ ] Switch to Calendar view: month grid "Today" button, weekday header row (Sun–Sat), color legend
      (Pending/Confirmed/Checked In/In Progress/Completed/Postponed/Canceled/No Show), Today's
      Schedule table (Time/Patient/Service/Doctor/Room/Status/Payment columns), "All Appointments"
      filter reset button, filter icon tooltip, and bottom "Showing X to Y of Z appointments" /
      "Page N of M" pagination.
- [ ] Status badges in the schedule table show the correct label per row and match the legend dot
      colors. Payment badges show "—" / "Unpaid" / "Partially Paid" / "Paid" correctly per row.

## 2. Arabic mode
- [ ] Toggle sidebar language switcher to **AR**. Confirm `<div dir="rtl">` wraps just this
      component's content (NOT the whole `admin/page.tsx` shell or the sidebar — sidebar stays LTR).
- [ ] Repeat every item in Section 1 — all labels, headers, empty states, tooltips, button text, and
      pagination text should now render in Arabic with **no raw English leaking through** (check
      card titles, table headers, status/payment badges, the stale-session panel, and dropdown menu
      items in the Pending Approvals "⋮" menu).
- [ ] Confirm layout mirrors correctly: the "⋮" More Actions dropdown menu (line ~947) and the header
      3-dot menu (line ~761) should now open aligned to the *start* edge (originally `right-0`, now
      `end-0`) — visually on the left in RTL.
- [ ] Confirm the stale-session-left-open tooltip (hover the red "Open Xh" badge) shows Arabic text
      with the elapsed-time value still embedded correctly.
- [ ] Confirm dates still render in `en-GB`/`en-US` format (Western digits, English month names) even
      in Arabic mode — e.g. the mini-calendar month header and "Today's Schedule" date line. This is
      intentional per DEC-043; do not treat this as a bug.

## 3. Value/label separation — stored-value regression check
- [ ] In Arabic mode, click **Approve** on a pending booking. Confirm the badge updates to the
      Arabic "Confirmed" label, then inspect the underlying record (e.g. via Supabase table editor
      or the booking details modal) and confirm `status` is stored as the English `"approved"` /
      `"confirmed"` value, never an Arabic string.
- [ ] In Arabic mode, click **Reject** on a pending booking. Confirm the same for `status: "rejected"`.
- [ ] Check-in or complete a booking from the details modal (if reachable from this view) and confirm
      the PATCH payload / stored `status` is still the English value while the visible badge is
      Arabic.
- [ ] Confirm `paymentStatus` badges are translated for display only — the underlying computed value
      (`"—"`/`"Unpaid"`/`"Partially Paid"`/`"Paid"`) used by `getPaymentStyle()` for color selection
      is untouched (badge colors still match correctly in Arabic).

## 4. Regression
- [ ] `npx tsc --noEmit` — 0 errors (confirmed in this session).
- [ ] `npm run test` — 597 passed, 6 expected fail (confirmed in this session, matches pre-existing
      baseline; `tests/components/bookings/AdminBookingsView.test.tsx` 10/10 passed using the
      component's default English fallback since the test renders without `lang`/`t` props).
