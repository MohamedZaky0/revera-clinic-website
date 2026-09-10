# Link Booking History (Patient Profile) to Appointment Directory's Booking Details (Manual Test Checklist)

**Scope:** Clicking a row in a patient's Booking History (Patient Profile) opens the same rich
booking-details view (status, payment, doctor/room, prescriptions) that clicking a row in the
Appointment Directory already opens.

**Date:** 2026-09-10

---

## Phase 1 — Extract `BookingDetailsModal` (foundation, no behavior change)

**Scope:** Mechanical extraction of the Booking Details modal (and its "Add Product" /
"Add Prescription" sub-modals) from `src/app/admin/page.tsx` into
`src/components/admin/bookings/BookingDetailsModal.tsx`. No behavior change — Appointment
Directory's existing booking-details flow must work exactly as before.

### Evidence Log

| Step | Result | Notes |
|------|--------|-------|
| `npx tsc --noEmit` | PASS | 0 errors across the whole project after the extraction. |
| `npx eslint src/app/admin/page.tsx src/components/admin/bookings/BookingDetailsModal.tsx` | PASS | 0 errors. Only pre-existing baseline `no-unused-vars` warnings on `page.tsx` (unrelated to this change); `BookingDetailsModal.tsx` has zero warnings. Removed the now-unused `printPrescription` import from `page.tsx` (its only call site moved into the new component). |
| Browser: login + Bookings → click a row with an open session ("saifuldeen Naser", status STARTED, manual booking) | PASS | Modal opened via `BookingDetailsModal`: reference ID + copy button, status badge (STARTED), source badge (MANUAL BOOKING), patient info, Service/Date/Session cards, Doctor/Location cards, Service Details + Total Price, Products & Consumables, Prescription card ("No prescription recorded"), Booking Information, Session Flow ("Treatment In Session"), Payment Summary (70 EGP / 0 EGP paid / 70 EGP outstanding / Unpaid) — all rendered correctly. |
| Browser: click the X close button | PASS | Modal closed cleanly, returned to the Bookings dashboard, no console errors from the close action. |
| Browser console | Pre-existing 401s from `fetchCustomers`/`fetchRequests`/`fetchAllReservations` (stale dev-session token) unrelated to this change; no errors from the new component or its prescription/reservation_products fetch effects. | |

### What moved into `BookingDetailsModal.tsx`

- The ~1,450-line inline JSX block (booking details modal + "Add Product" sub-modal + "Add
  Prescription" sub-modal).
- Handlers/effects that exist only to serve this modal, previously declared near the top of
  `AdminPage`: the prescription-fetch effect, `handleSendPrescriptionWhatsApp`,
  `handleSaveDrawerPrescription`, `handleAddProductToBooking` (renamed from
  `handleAddProductToViewingBooking`), and the real-time `reservation_products` sync effect.
- Local-only state that nothing outside the modal reads: `copiedBookingRef`,
  `isEditingService`, `isEditingNotes`, `notesDraft`, `showDrawerProductModal` +
  `selectedDrawerProductId`/`Qty`, `showDrawerPrescriptionModal`, `drawerRxDiagnosis`/`Meds`/`Notes`,
  `savingDrawerRx`, `drawerPrescriptions`.
- A `page.tsx`-level effect that reset `isEditingService`/`isEditingNotes`/`notesDraft` on every
  `viewingBooking` change was deleted — it's now redundant because that state lives locally in the
  new component and starts fresh on every mount; the two interactions that need an explicit reset
  (finishing a service edit, finishing a note edit) already do it inline.

### What stayed in `page.tsx` (passed as props)

`viewingBooking`/`setViewingBooking` (as `booking` + `onClose`/`setBooking`), `rooms`, `branches`,
`dbCustomers`, `employeesList`, `inventoryProducts`, `localServices`, `hasPermission`,
`authenticatedJsonHeaders`, `fetchRequests`, `fetchAllReservations`, `fetchCustomers`,
`fetchInventoryProducts`, `saveNotes`, `setActiveNav`, `setViewingCustomerProfile`,
`setCheckoutBooking`, `setInvoiceBooking`, `setPostponeBooking`/`Mode`/`NewDate`/`NewTime`/`FollowUpDate`.
`getEffectiveServicePrice`, `printInvoice`, `printPrescription`, `supabase`, `useLanguage()`, and
`useAlertConfirm()` are imported/called directly inside the new component instead of being threaded
through as props.

`Req` was changed from a page-local `type` to `export type Req` so the new component (and future
extractions) can import it.

### Known dead code left untouched

`bookingCustomerPackages` / `setBookingCustomerPackages` (fed by a `viewingBooking`-keyed effect in
`page.tsx`) is computed but never read anywhere in the app. It predates this change and is out of
scope for a "no behavior change" extraction — left as-is.

### Pre-Deployment Checks

- [x] `src/components/admin/bookings/BookingDetailsModal.tsx` exists and exports a default component.
- [x] `src/app/admin/page.tsx` imports and renders `<BookingDetailsModal ... />` in place of the old inline block, still gated on `viewingBooking`.
- [x] `tsc --noEmit` clean.
- [x] `eslint` clean (0 errors) on both touched files.
- [x] `npm run build` (production build) — passed: compiled successfully, TypeScript check passed, `/admin` and all 38 pages generated with no errors (only pre-existing, unrelated warnings: deprecated `middleware` convention, missing `metadataBase`).

### Browser Verification Checklist

- [x] Appointment Directory / Bookings dashboard: click a booking row → Booking Details modal opens with correct data.
- [x] Status badge and source badge render correctly for a manual, in-progress booking.
- [x] Payment Summary totals match the booking (service price, paid, outstanding, status).
- [x] X close button closes the modal and returns to the underlying view.
- [ ] "View Patient" button (closes modal, navigates to Patients, opens that patient's profile).
- [ ] Add Service / remove a service line.
- [ ] Add Product to invoice.
- [ ] Add Prescription (save, then confirm it shows in the Prescription card + WhatsApp/Print Rx buttons).
- [ ] Notes: add/edit/save a note.
- [ ] Status-flow buttons for other statuses (Confirm, Check In, Start Session, Pay & Settle Invoice).
- [ ] Postpone / Cancel / No Show actions (from "Other Actions").
- [ ] View Invoice / Print Invoice buttons.

---

## Phase 2 — Wire Patient Profile → Booking History into `BookingDetailsModal`

**Scope:** Clicking a row in `CustomerProfileDrawer`'s Booking History table opens
`BookingDetailsModal` on top of the drawer, using the same page-level `viewingBooking` state the
Appointment Directory already uses. Added a Room column and replaced the raw Paid/Left EGP
columns with a single Paid/Partial/Unpaid status badge, matching the Directory's presentation.

### Evidence Log

| Step | Result | Notes |
|------|--------|-------|
| `npx tsc --noEmit` | PASS | 0 errors. |
| `npx eslint src/components/admin/patients/CustomerProfileDrawer.tsx src/components/admin/translations.ts src/app/admin/page.tsx` | PASS | 0 new errors/warnings. One pre-existing `Cannot call impure function during render` error (`Math.random()` in a `useMemo`, line ~268) predates this change — confirmed via `git show HEAD` — and is unrelated to the touched Booking History code. |
| Browser: Patients → open "saifuldeen Naser" → Booking History tab | PASS | Table shows DATE/SLOT, SERVICE, PROVIDER, ROOM, PAYMENT, STATUS columns. Room resolves correctly ("Laser Room NC 1" for the Aesthetic Injections booking); Payment badges render correctly (red "Unpaid" x2, amber "Partial" x1). |
| Browser: click the "Partial" row (Aesthetic Injections, saif zaki, Laser Room NC 1) | PASS | `BookingDetailsModal` opened on top of the Patient Profile drawer with matching data (doctor, room, service, price). |
| Browser: click X to close | PASS | Modal closed, returned cleanly to the Patient Profile's Booking History tab (not the dashboard) — confirms `viewingBooking`/`onClose` sharing with the Directory's own wiring works as a stacked overlay. |
| Browser: switch to Arabic (RTL) | PASS | New column headers ("الغرفة" / "الدفع") and payment labels ("غير مدفوع" / "جزئي") translated correctly; row click still opens the modal correctly in RTL. |
| Browser console | No new errors. Same pre-existing stale-session 401s (`fetchCustomers`/`fetchRequests`/`fetchAllReservations`) seen in Phase 1, unrelated to this change. | |

### What changed

- `src/components/admin/patients/CustomerProfileDrawer.tsx` — added `rooms: any[]` and
  `onViewBooking?: (booking: any) => void` props; Booking History table: added a Room column
  (`rooms.find(rm => rm.id === res.roomId)?.name`), replaced the Paid/Left EGP columns with one
  Paid/Partial/Unpaid badge (same paid/left derivation that was already there, just recombined into
  a tri-state badge instead of two raw numbers), added `onClick`/`cursor-pointer` to each row.
  Package-redemption "via `<package>`" annotations (previously shown under the Paid column) now
  render under the new Payment badge instead of being dropped.
- `src/components/admin/translations.ts` — `customerProfileDrawer.colPaid`/`colLeft` (en+ar)
  replaced with `colRoom`/`colPayment`; added `paymentStatusLabels: { paid, partial, unpaid }` (en+ar).
- `src/app/admin/page.tsx` — passes `rooms={rooms}` and
  `onViewBooking={(booking) => setViewingBooking(booking)}` into `<CustomerProfileDrawer>`. No new
  state: reuses the existing `viewingBooking` state and the already-wired
  `<BookingDetailsModal booking={viewingBooking} ...>` render from Phase 1 — clicking a history row
  just populates the same state the Appointment Directory populates, so the modal stacks on top of
  the open Patient Profile drawer for free.

### Pre-Deployment Checks

- [x] `CustomerProfileDrawer` receives `rooms` and `onViewBooking` as props.
- [x] Booking History header shows Date/Slot, Service, Provider, Room, Payment, Status (6 columns; `colSpan={6}` on the empty-state row still matches).
- [x] `tsc --noEmit` clean.
- [x] `eslint` clean (0 new errors).
- [x] `npm run build` (production build) — passed: compiled successfully, TypeScript check passed, `/admin` and all 38 pages generated with no errors (only pre-existing, unrelated warnings: deprecated `middleware` convention, missing `metadataBase`).

### Browser Verification Checklist

- [x] Booking History table shows the Room column with a resolved room name (or "—" when no room is set).
- [x] Payment badge shows Paid / Partial / Unpaid correctly per booking.
- [x] Clicking a row opens `BookingDetailsModal` with the correct booking's data.
- [x] Closing the modal returns to the Patient Profile (not the dashboard).
- [x] Arabic (RTL): column headers and payment labels translate; row click still works.
- [ ] A booking with package redemptions still shows the "via `<package>`" note (only untested because the seeded data for this patient had no package redemptions).
- [ ] Add a fresh booking with a room assigned and confirm the Room column picks it up without a page refresh.

## Phase 3 — Prescription `booking_id` linkage from the Prescriptions tab

**Scope:** A prescription written from a patient's own Prescriptions & Records tab (not from
inside a Booking Details modal) now carries `booking_id` when the caller arrived at that patient's
profile via "View Patient" from a specific booking — so it shows up under that booking's
"PRESCRIPTION" card, not just in the patient's own prescription list.

**Design:** Added `prescriptionBookingContext` state to `useCustomerProfile.ts` (co-located with
`viewingCustomerProfile`, since that's where `handleSavePrescription` already lives). It is set to
a booking id only by `BookingDetailsModal`'s "View Patient" button (right before it navigates away),
and cleared to `null` everywhere a patient profile is closed or a *different* patient is about to be
opened (`CustomerProfileDrawer`'s "Back to Patients" and "Edit Profile" actions, and the "New
Patient" quick-action in `page.tsx`) — the Patients Directory list itself is only ever rendered while
no profile is open, so a stale context can't leak from one patient to another through that path.
`handleSavePrescription` reads it directly (same-hook closure) and adds `booking_id` to the POST
payload **only when creating a brand-new prescription** (`!editingPrescription`); editing an
existing prescription never touches `booking_id` in the payload at all, so an existing link is
never overwritten by a stale or absent context. The context is cleared again immediately after a
successful save, so it applies to the next save only, not indefinitely for the rest of the profile
session.

**Known, accepted gap (unchanged from before this phase):** Prescriptions written with *no* booking
in context (e.g. arriving at a patient's profile from the Patients Directory) still have no
`booking_id`, exactly as the original plan flagged — there is still no booking picker in the
Prescriptions tab UI itself. This phase only closes the gap for the one path that's currently
click-through-able (Booking Details → View Patient → Write Prescription).

### Evidence Log

| Step | Result | Notes |
|------|--------|-------|
| `npx tsc --noEmit` | PASS | 0 errors. |
| `npx eslint src/components/admin/patients/useCustomerProfile.ts src/components/admin/patients/CustomerProfileDrawer.tsx src/components/admin/bookings/BookingDetailsModal.tsx src/app/admin/page.tsx` | PASS | 0 new errors. Same pre-existing `Math.random()` lint error from Phase 2, confirmed unrelated. |
| Browser: open booking `5903b92e-…` (saifuldeen Naser, 7 Sept, STARTED, no prescription) → View Patient → Prescriptions & Records → Write Prescription → save | PASS | Network capture of the `POST /api/prescriptions` response confirmed `"booking_id":"5903b92e-af6b-4313-bbc6-a979a4345398"` on the created record. |
| Browser: reopen that same booking's Booking Details | PASS | PRESCRIPTION card now shows the just-written diagnosis ("Phase 3 test diagnosis - booking context check") instead of "No prescription recorded". |
| Cleanup | DONE | Deleted the test prescription via the Prescriptions tab's trash icon after verifying; patient's record count back to 2. |

### Pre-Deployment Checks

- [x] `useCustomerProfile.ts` exposes `prescriptionBookingContext`/`setPrescriptionBookingContext`.
- [x] `BookingDetailsModal`'s "View Patient" sets the context before navigating away.
- [x] All known close/navigate-away paths for the patient profile clear the context.
- [x] `handleSavePrescription` only stamps `booking_id` on create, never on edit.
- [x] `tsc --noEmit` / `eslint` clean.
- [x] `npm run build` (production build) — passed: compiled successfully, TypeScript check passed, `/admin` and all 38 pages generated with no errors (only pre-existing, unrelated warnings: deprecated `middleware` convention, missing `metadataBase`).

### Browser Verification Checklist

- [x] Write a new prescription after "View Patient" from a specific booking → `booking_id` set on the created record (confirmed via network response).
- [x] That booking's Booking Details modal shows the new prescription.
- [x] Deleted the test prescription afterward; patient's prescription count returned to its prior value.
- [ ] Write a prescription with NO prior booking context (e.g. opened via Patients Directory) → confirm `booking_id` stays absent (expected; not explicitly re-verified this pass, follows directly from the `if (!editingPrescription && prescriptionBookingContext)` guard).
- [ ] Edit an existing prescription that already has a `booking_id` → confirm the link survives the edit (not explicitly re-verified this pass; follows from `booking_id` never being included in the edit payload).
- [ ] Two bookings, write a prescription from the first one's "View Patient" context, then immediately try to write a second one for the same patient without navigating away again → confirm the second one has no `booking_id` (context is single-use, cleared after the first save).
