# Brief 14 Manual Test Checklist — `AdminNewBookingView.tsx` Arabic translation

Target: `src/components/admin/bookings/AdminNewBookingView.tsx`. Wiring added: `lang`/`t` props,
new `bookings.adminNewBookingView` namespace in `src/components/admin/translations.ts`, passed from
`src/app/admin/page.tsx`'s two render sites (`activeNav === "Bookings"` full-view New Booking, and
`activeNav === "New Booking"`).

Login: `finance-test@revera.com` / `ReveraTest1!` at `localhost:3000/admin`.

## 1. English baseline (sanity)
- [ ] Open New Booking from both entry points (Bookings tab → "New Booking" button, and the
      sidebar "New Booking" nav item). Both should render identically.
- [ ] Header: "New Booking" title, subtitle, close (X) button tooltip.
- [ ] Patient Information card: phone field with country code, "Browse All Patients" / "Hide
      Patients List" toggle, floating patient dropdown (header count, "Close ✕", empty state,
      Select/Selected badges), First/Last Name, Email, WhatsApp + "Same as phone number" checkbox.
- [ ] Appointment Details card: Branch, Room ("Auto-Assign Room" option), Service, Doctor, Date
      selects; time-slot buttons (booked slots show "(Booked)" and a disabled/struck style); Session
      Type radio cards (In Person / Online); Notes textarea with char counter; Amount Paid Now.
- [ ] If the selected patient has an active package: right-column "Active Package" card shows name,
      remaining sessions, expiry, and "Use Package" / "Package Applied (0 EGP)" toggle button.
- [ ] Bottom bar: "Cancel" and "Create Booking" buttons.
- [ ] Click "Create Booking" → Confirm Booking Summary modal: all rows (Patient Name, Phone Number,
      Service, Doctor, Branch/Room, Date & Time, Session Type, Price/Payment or Service Price, Notes
      if present), "Back to Edit" and "Confirm & Create Booking" buttons.
- [ ] Validation alerts fire correctly in English when required fields are missing (phone/first
      name, service, doctor, time slot).

## 2. Arabic mode
- [ ] Toggle sidebar language switcher to **AR**. Confirm `<div dir="rtl">` wraps this component's
      root only.
- [ ] Repeat every item in Section 1 in Arabic — no raw English text should remain anywhere
      (header, patient card, dropdown, appointment details, session type card, active package card,
      bottom bar, confirm modal, and all `alert()` validation messages).
- [ ] Confirm the Session Type radio cards now show plain Arabic labels only (previously hardcoded
      "In Person / في العيادة" style bilingual hack — now shows a single clean label per language,
      matching the DEC-043 gender-dropdown precedent from Briefs 7-9).
- [ ] Confirm RTL mirroring: the floating patient dropdown (`start-0 end-0`), the phone clear (✕)
      button (`pe-3`), and the country-code compartment border (`border-e`) all sit on the correct
      visual side in RTL.
- [ ] Confirm the **Service** dropdown and the Confirm-modal Service row show the Arabic service
      name coming from the DB's `ar` column (not from `translations.ts`) — verify by comparing
      against the same service's Arabic name shown elsewhere (e.g. public site or Patients tab).
- [ ] Confirm dates in the Confirm modal ("Date & Time" row) still render in `en-GB`/`en-US` format
      (Western digits, English month/weekday abbreviation) even in Arabic mode — intentional per
      DEC-043, not a bug.

## 3. Value/label separation — stored-value regression check
- [ ] In Arabic mode, select "In Person" session type, complete a booking. Inspect the created
      reservation record (Supabase or the Bookings table) and confirm `sessionType` is stored as
      `"in_person"` (English), never an Arabic string.
- [ ] Repeat for "Online" → confirm `sessionType: "online"` stored.
- [ ] Confirm the created reservation's `status` is `"approved"` (English) regardless of UI language.
- [ ] Confirm `serviceId`, `doctorId`, `branchId`, `roomId` in the POST payload are always the raw
      DB ids, never translated strings, in both languages.
- [ ] Confirm the created booking then appears correctly in `AdminBookingsView` (Brief 13) with the
      correct Arabic status badge, proving both components' value/label separation are consistent
      with each other.

## 4. Regression
- [ ] `npx tsc --noEmit` — 0 errors (confirmed in this session).
- [ ] `npm run test` — 597 passed, 6 expected fail (confirmed in this session, matches pre-existing
      baseline; no dedicated test file exists for `AdminNewBookingView.tsx`, so this only confirms
      no regressions elsewhere).
