# PRODUCT_RULES.md — Revera Clinics Business Rules (Enforced in Code)

> **Last Updated:** 2026-06-26
> **Source:** Confirmed from live code only — no speculation
> **Previous content was for a different project — discarded entirely**

---

## What This File Is

This file documents business logic that is **actually enforced in the codebase today**.
It is not a wishlist or aspirational spec. If a rule is not enforced in code, it is not listed here.

---

## Booking / Scheduling Rules

### Daily capacity cap — 8 bookings per service per day per branch
**Enforced in:** `src/app/api/reservations/route.ts` — PATCH approve action

When approving a reservation, the system counts existing approved reservations for the same
`service_id`, `date`, and `branch_id`. If count >= 8, the approval is rejected with:
`{ error: 'Day is fully booked' }` (HTTP 400).

```
If (approved bookings for service+date+branch) >= 8 → reject approval
```

Branch matching: if reservation has a `branch_id`, filter by branch. If null, filter by `branch_id IS NULL`.

---

### Time slot uniqueness — one booking per 15-min slot per service per day per branch
**Enforced in:** `src/app/api/reservations/route.ts` — PATCH approve action

When approving with a `timeSlot`, the system checks if any other approved booking for the same
service+date+branch already occupies that slot. If yes, returns:
`{ error: 'Time slot already taken' }` (HTTP 400).

---

### Slot duration-aware availability
**Enforced in:** `src/app/api/availability/route.ts`

The availability endpoint checks whether a contiguous block of 15-min slots equal to the
service's duration is free. A service with duration 1:00 Hour needs 4 consecutive free
15-min slots.

Operating hours are defined by the branch's specific `service_hours` table configuration when a `branchId` is specified. If not specified or no branch-specific hours are set, the global clinic-wide hours (09:00–20:00) defined in `src/lib/services.ts:ALL_15MIN_SLOTS` are used as a fallback.

---

### Required booking fields
**Enforced in:** `POST /api/reservations`

`serviceId`, `date`, `name`, `email`, `phone` are required. Missing any returns HTTP 400.

---

### Default session type
**Enforced in:** `POST /api/reservations`

If `sessionType` is not provided, defaults to `'in_person'`.

---

## Service Catalog Rules

### Service duration format
**Enforced in:** `src/lib/services.ts:getDurationInMinutes()`

Duration strings are parsed from formats: `'1:30 Hours'`, `'30 mins'`, `'1:30'`. Default fallback
if unparseable: 30 minutes.

---

### Service visibility and active flags
**Confirmed in schema:** `services.visible` and `services.active` columns exist.
**Note:** No enforcement of these flags on the public website was confirmed in code during audit.
The admin panel displays them but patient-facing queries (`GET /api/services`) return all services
without filtering by visible/active.

---

## Admin Panel Rules

### No authentication on admin panel
**Confirmed:** `/admin` page has no login gate. No middleware protects it. Anyone with the URL can access it.

---

### Admin can hard-delete all reservations
**Enforced in:** `DELETE /api/reservations?id=all`

Deletes all rows from the reservations table. No soft-delete. No confirmation beyond the UI.

---

## localStorage Keys (Revera-branded)

Service state on the admin side persists to localStorage under these keys:
- `revera_service_toggles`
- `revera_dynamic_services`
- `revera_dynamic_categories`

These keys will need changing when forking for client #2.

---

## Customer Wallet Rules
**Enforced in:** `PATCH /api/reservations` (checkout/settlement action)

When completing a reservation, the receptionist processes a payment settlement. If the reservation's status is updated to `'completed'`, the linked customer's profile is updated:
- **Wallet Balance**: Decreased by any `walletWithdrawal` amount used for payment and increased by any `walletDeposit` (overpayment change saved to wallet).
- **Total Spent**: Increased by the amount paid plus any wallet balance used to offset the cost.
- **Outstanding Debt**: Increased by any unpaid remainder (`amountLeft`).

---

## Doctor Multi-Shift Scheduling Rules
**Enforced in:** `src/components/BookingModal.tsx` & `src/app/admin/page.tsx`

Doctors can define daily schedules containing either legacy single-shift bounds (`start` & `end` strings) or a multi-shift array of objects `shifts: { start, end }[]`.
- **Availability Search:** The availability check validates whether a requested slot's start and end times fall completely within at least one of the shifts configured for that day.
- **Min/Max Boundary Expansion:** The calendar grid bounds expand to dynamically encapsulate the lowest starting hour and highest ending hour among all configured shifts.

---

## Presence Inactivity Timer Rules
**Enforced in:** `src/app/admin/page.tsx`

- **Alert Trigger:** Standard staff employees are prompted with a presence confirmation modal after 30 minutes of continuous inactivity (configurable in Settings).
- **Countdown Timeout:** The employee has 10 seconds to respond. Failure to respond submits an automatic alert to the supervisor/administrator.
- **Activity Reset Events:** Any keyboard/mouse movements (`mousemove`, `keydown`, `click`, `scroll`, `touchstart`) immediately reset the inactivity check clock and automatically dismiss/close the presence modal.

---

## Settings Navigation Sidebar Highlights
- **Settings Hover Highlighting:** The Settings sidebar link remains highlighted/active when sub-panels `"Deposit Settings"` or `"Inactivity Settings"` are open (`activeNav`).

---

## Promotions Rules
- **Disabled Gray Card Styling:** Promotion cards are styled with `grayscale opacity-60` when their status is `disabled` to visualy highlight inactive rules.

---

## What Is NOT Enforced (But May Be Assumed)

The following are **not currently enforced in code**:
- Patient phone OTP verification (auth modal is UI-only, OTP is simulated)
- Service visible/active flags filtering public service list
- Package/session tracking (not built)
- External Payment Gateway processing (payments are logged as cash/card settlements in the admin dashboard ledger only)
- Automated reminders (enable_reminder flag exists on services but no sending logic found)

