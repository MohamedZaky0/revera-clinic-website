# PROPOSAL-001 Manual Test Checklist — Client Config Centralization

> **Living document.** Update the evidence log as checks are run.
> **Goal:** prove the Revera deployment is visually and behaviorally identical after replacing literals with `CLIENT.*` and CSS custom properties.
> **Important:** run storage checks in a fresh browser profile. Chunk D intentionally renames browser keys from hardcoded `revera_*` strings to values derived from `CLIENT.storagePrefix`; existing cached patient/staff state resets once after deployment.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### Public site visual parity

- [ ] Capture the home page before/after at desktop width; compare header, hero, services, packages, WhatsApp button, and footer pixel-for-pixel.
- [ ] Capture the About page before/after; compare intro, approach, journey, results, and FAQ colors and logos.
- [ ] Confirm every public logo still loads from `/images/main_logo.png` and accessible names still read exactly as before for Revera.
- [ ] Confirm EN/AR language switching remains unchanged.

### Booking flow and WhatsApp

- [ ] Complete one full public booking flow in a fresh browser profile.
- [ ] Confirm the deposit/receipt WhatsApp message is byte-for-byte equivalent to the previous Revera message, including patient, service, date/time, payment method, sender, and receipt note.
- [ ] Confirm the WhatsApp destination number and QR/payment links remain correct.
- [ ] Confirm the booking modal colors, date picker, time picker, package cards, and confirmation screens are visually unchanged.

### Staff login and storage migration

- [ ] In a fresh browser profile, log in through `/login`; confirm the staff portal branding, logo, and colors are unchanged.
- [ ] Confirm `${CLIENT.storagePrefix}_admin_session_active` is written to session storage after login.
- [ ] With only the legacy hardcoded key present, confirm the user is asked to log in once; document this as the expected one-time storage-key migration effect.
- [ ] Confirm logout clears the derived admin-session/staff-auth keys.

### Patient profile and cross-tab state

- [ ] Log in as a patient and confirm the profile cache uses `${CLIENT.storagePrefix}_user`.
- [ ] Confirm patient profile header, financial cards, booking/package history, and print actions are visually unchanged.
- [ ] Toggle the customer-login setting in Admin and verify a second public-site tab updates through the derived settings-sync key/BroadcastChannel.

### Admin settings

- [ ] Open Settings → Clinic Profile; confirm clinic name and WhatsApp defaults still display the existing Revera values.
- [ ] Open Settings → Deposit; confirm InstaPay and mobile-wallet labels/defaults are unchanged.
- [ ] Open Home, Services, Booking, Branches, Notification, Queue, Inactivity, Medical Records, Role, and Service Hours settings; confirm colors and controls are unchanged.

### Doctor and operational modules

- [ ] Capture one doctor-portal screen before/after; compare sidebar, ongoing session, schedule, patient drawer, profile, and analytics styling.
- [ ] Open Inventory, Finance, Reports, Transactions, HR, Employees, Patients, Packages, Promotions, Support, Rooms, and Terms Management; spot-check that mapped olive/gold/dark/tint/light colors render identically.
- [ ] Print one invoice, prescription, patient record, and employee record; confirm branded colors, clinic name, and contact details are unchanged.

### Fork smoke test

- [ ] On a temporary local branch only, change `CLIENT.name`, `nameShort`, phone fields, logo path, and `storagePrefix`; confirm the affected chrome/messages/defaults update without searching other source files.
- [ ] Temporarily change the CSS brand custom properties and confirm public/admin mapped colors follow them.
- [ ] Revert temporary fork values before recording completion evidence.
