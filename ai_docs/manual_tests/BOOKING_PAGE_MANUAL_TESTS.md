# Booking Page (`/book`) Manual Test Checklist — DEC-040

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database / local dev server (`npm run dev`).
> Full reasoning and code pointers are in `ai_docs/DECISIONS.md` → **DEC-040**.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| | | | | |

## Per-check list

### `/book` renders the full flow as a page, not a popup

- [ ] Navigate directly to `/book`. Confirm: no full site Navbar/footer, just a minimal header (logo linking to `/`, EN/AR toggle) and the booking card — no backdrop, no `×` close button.
- [ ] Complete Step 1 → Step 2 → (Step 3 if deposit is enabled) exactly as the old popup allowed. Confirm a reservation is created (`GET /api/reservations` or admin panel shows it) exactly like a modal-created booking would.
- [ ] Press **Escape** while mid-form on `/book`. Confirm nothing happens — the form is not cleared (this is intentionally different from the popup, which closes on Escape).
- [ ] On the success screen, confirm the button reads "Back to Home" (not "Close") and actually navigates to `/`.

### `?service=` preselection

- [ ] From the Services page, click a specific service card. Confirm you land on `/book?service=<id>` with that exact service already selected in Step 1's dropdown, correct category chip active, and session type (in-clinic/online) matching that service's allowed type.
- [ ] Navigate to `/book` directly with no query param. Confirm Step 1 loads with no service preselected (same as opening the popup with no `detail.serviceId`).
- [ ] Navigate to `/book?service=999999` (a non-existent id). Confirm it doesn't crash — service picker just shows nothing preselected.

### Every non-Navbar CTA now navigates instead of opening a popup

- [ ] Homepage Hero "Make an Appointment" → lands on `/book` (no service preselected).
- [ ] Homepage Services section — click a service card → `/book?service=<id>`; click the section's general "Book Now"/View-more CTA → `/book`.
- [ ] `/services` page — same two behaviors (card → `?service=`, general CTA → plain `/book`).
- [ ] `/about` page CTA(s) → `/book`.
- [ ] `/contact` page form submit → `/book`.
- [ ] `/profile` page "Book your first appointment" (empty bookings state) → `/book`.

### Navbar "Quick Book" still works as a popup (unchanged)

- [ ] On any page **except** `/book`, click Navbar's desktop "Make Appointment" button. Confirm the popup opens exactly as before (backdrop, `×` close button, Escape closes it, click-outside closes it).
- [ ] Same check on mobile — open the mobile menu, tap "Make Appointment," confirm the popup opens and the mobile menu closes.
- [ ] Complete a booking through the Quick Book popup end to end (all steps) — confirm it still works identically to before this change (no regression in the shared `BookingModal` internals: pricing, availability, deposit payment, terms).
- [ ] On `/book` itself, confirm there is **no** second/hidden popup instance interfering (e.g., no duplicate Escape-key behavior, no stray backdrop).

### Cross-page sanity

- [ ] Visit each of the 6 pages that used to mount `<BookingModal />` directly (home, about, blog, contact, services, profile) and confirm Quick Book still opens correctly from each (proves the single `GlobalBookingModal` mount in the root layout covers every route).
- [ ] Confirm `/admin` is unaffected — no visible booking popup artifact, no console errors related to `BookingModal`/`GlobalBookingModal`.

### SEO / metadata

- [ ] View page source (or `curl`) on `/book` — confirm `<title>` and `<meta name="description">` are present and reference the clinic name (via `CLIENT.name`), not hardcoded "Revera" text.
- [ ] Confirm Open Graph tags (`og:title`, `og:description`, `og:image`) are present for link-preview purposes (relevant once this URL is used in ad campaigns).
