# RISKS.md — Revera Clinics Risk Register

> **Last Updated:** 2026-07-22
> **Previous content was for a different project — discarded entirely**

---

## RISK-001: Duplication Friction (hardcoded Revera-specific values)

**Severity:** High
**Type:** Operational / Maintainability

**Description:**
When forking this repo for client #2, Revera-specific values are scattered across many files
rather than centralized in a single config. This means every fork requires hunting through
the codebase to find and replace all client-specific values, which is error-prone and slow.

**Specific Files and Lines:**

### Clinic Name "Revera"
| File | Lines | Context |
|---|---|---|
| `src/app/layout.tsx` | 21 | Page title metadata: "Revera Clinics - Medical Center" |
| `src/app/services/page.tsx` | 14, 16 | Page title + description metadata |
| `src/app/contact/page.tsx` | 11, 13 | Page title + description metadata |
| `src/app/blog/page.tsx` | 11–12 | Page title + description metadata |
| `src/app/about/page.tsx` | 17, 19 | Page title + description metadata |
| `src/lib/translations.ts` | ~30 instances | All UI copy strings (welcome slides, about text, testimonials, FAQs) |
| `src/components/Navbar.tsx` | 71, 116, 425 | Logo alt text, WhatsApp message text |
| `src/components/AuthModal.tsx` | 121 | Logo alt text |
| `src/components/BookingModal.tsx` | 312 | Logo alt text |
| Multiple components | Various | Image `alt` attributes |

### Brand Colors (#414E36 olive, #C4AE7C gold)
| File | Type | Notes |
|---|---|---|
| `src/app/globals.css` | **Centralized** | CSS custom properties defined here — this is correct |
| `src/components/AboutSection.tsx` | Lines 146, 176, 181, 239, 250 | Inline Tailwind JIT `text-[#414E36]`, `bg-[#414E36]` — bypasses CSS vars |
| `src/components/AboutPageIntro.tsx` | Lines 257, 373, 383 | Inline `#C4AE7C` in style props |
| `src/components/BookingModal.tsx` | Lines 637, 648 | `accent-[#414E36]` Tailwind JIT |
| `src/app/admin/page.tsx` | Lines 104–107 | `bg-[#C4AE7C]/10` in overviewCards constant |
| Multiple other components | Various | See full list in hardcoding audit output |

### Logo Path `/images/main_logo.png`
Used in 15+ components as a raw string. Not centralized. Files:
`Navbar.tsx`, `AuthModal.tsx`, `BookingModal.tsx`, `AboutSection.tsx`, `AboutPageIntro.tsx`,
`AboutWhatWeDo.tsx`, `FaqSection.tsx`, `HomeServicesSection.tsx`, `OurJourneySection.tsx`,
`OurApproachSection.tsx`, `ServicesSection.tsx`, `Preloader.tsx`, `TestimonialsSection.tsx`,
`admin/page.tsx`

### Phone Numbers
| File | Notes |
|---|---|
| `src/lib/translations.ts` | 8+ instances of `(+20) 01035595691` in translation strings |
| `src/components/Navbar.tsx` | Lines 116, 154, 173, 425, 451, 463 |
| `src/components/ServicesSection.tsx` | Lines 147, 207 — in WhatsApp `wa.me` URLs |
| `src/components/HomeServicesSection.tsx` | Line 212 |
| `src/components/HeroSlider.tsx` | Line 47 |
| `src/components/SiteFooter.tsx` | Lines 532, 536 |
| `src/app/admin/page.tsx` | Lines 1214, 1221 — as fallback defaults |
| `src/app/contact/page.tsx` | Line 13 — page description metadata |

### WhatsApp Message Text (hardcoded to "New Cairo branch")
| File | Lines |
|---|---|
| `src/components/Navbar.tsx` | 116, 425 — "Hello Revera, I'd love to schedule a consultation at your New Cairo branch..." |
| `src/components/ServicesSection.tsx` | 147, 207 — "Hello Revera, I'm interested in booking ... at your New Cairo branch" |
| `src/components/HomeServicesSection.tsx` | 212 — same pattern |
| `src/components/HeroSlider.tsx` | 47 — "Hello Revera, I'd love to schedule a consultation..." |

### Service Category Names (Dermatology, Gynecology, Physical Therapy, Osteopathy)
| File | Lines | Notes |
|---|---|---|
| `src/lib/services.ts` | 116–119 | **Centralized** in `CATEGORY_LABELS` object — good |
| `src/lib/translations.ts` | 55–57, 79–83, 97–99, 258–282, 447 | Repeated in translation strings — duplicated |
| `src/app/admin/page.tsx` | 1148–1151, 6915–6916 | Hardcoded string arrays |

### localStorage Keys (branded with "revera_")
| File | Lines |
|---|---|
| `src/lib/serviceStore.ts` | 3–5 | `revera_service_toggles`, `revera_dynamic_services`, `revera_dynamic_categories` |

### Supabase Connection Config
Correctly stored in env vars (`.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**This is clean.** Forking for client #2 only requires pointing at a new Supabase project via `.env.local`. No code changes needed for connection config.

**Mitigation:** See `PROPOSALS.md` for the plan to centralize all Revera-specific values into a single `client.config.ts` file.

---

## RISK-002: Admin Auth Is Client-Side Only (Partially Resolved)

**Severity:** Medium (was Critical)
**Type:** Security
**Status:** Partially mitigated as of 2026-07-06

**What changed:**
The admin page now has a full Supabase email/password login gate. Employees are managed via `employee_accounts` + `roles` tables. Invites are sent via Supabase Auth. Superadmin access is determined by the persisted employee role. `/api/auth/me` verifies the JWT and returns role/permissions.

**Remaining gap:**
A migration at `supabase/migrations/20260722140000_enable_row_level_security.sql` enables RLS for all `public` tables, preventing direct browser/anon-key table access once applied to Supabase. Middleware validates bearer tokens against Supabase Auth before allowing employee, HR, role, and provider schedule-audit endpoints. API routes still use the service role key, which bypasses RLS, so remaining sensitive routes require server-side authorization before this risk can be closed.

**What would fully resolve this:**
- Add Next.js middleware that validates a Supabase session cookie for `/api/` routes
- Or add `Authorization: Bearer` token validation in individual route handlers
- Or use Supabase RLS policies on all tables (currently bypassed by service role key)

---

## RISK-003: Patient Auth Is Non-Functional

**Severity:** Medium
**Type:** Feature completeness
**Status:** Mitigated 2026-07-22

**Resolution:**
`AuthModal` now sends and verifies OTPs through Supabase Auth only. Insecure demo fallbacks, including the `123456` verification code and unauthenticated email lookup fallback, were removed. If Supabase Auth is unavailable, sign-in fails safely with a user-facing error.

---

## RISK-004: localStorage as Primary Service/Category Storage

**Severity:** Medium
**Type:** Data integrity

**Description:**
`serviceStore.ts` reads and writes services/categories from localStorage first. Supabase
is synced only on explicit save actions. If a user opens the admin panel on a different
browser or clears localStorage, they lose unsaved changes. The Supabase copy may be stale.

---

## RISK-005: Single 550KB Admin Page File

**Severity:** Low (current scale) → Medium (as features grow)
**Type:** Maintainability

**Description:**
`src/app/admin/page.tsx` is a single ~550KB client component containing 40+ admin sections,
hardcoded mock data arrays, all state variables, and all UI. Some sections are genuinely
mock UI backed by hardcoded constant arrays — not Supabase: consultation notes, treatment
plans, before/after photos, the Finances Dashboard aggregate reporting view (`MOCK_POS_ORDERS`
constant), Refunds, Shipping.

**Corrected 2026-07-21:** Prescriptions, Payroll, Inventory, and POS were previously listed
here as mock too — that was wrong as of the 2026-07-20/21 migrations. They now have real
Supabase tables (`prescriptions`, `hr_payroll`, `doctor_payroll`, `inventory_products`,
`inventory_devices`, `product_sales`) with real API routes reading/writing them — see
`DB_SCHEMA.md`. The size/maintainability concern for `admin/page.tsx` itself is unchanged.

**Naming collision to be aware of:** "Finance" here refers to the pre-existing `Finances Dashboard`
panel (`activeNav === "Finances Dashboard"`), which has no reachable sidebar trigger (the
`financesExpanded` state that would expand it is never wired to a nav item). This is unrelated
to the disabled `Finance` sidebar stub added in DEC-011 (`comingSoon: true`, superadmin-only,
no page behind it at all). Do not conflate the two when working on either.

---

## RISK-006: GPS-Based Attendance Can Be Spoofed

**Severity:** Medium
**Type:** Security / Trust

**Description:**
The distance-vs-800m check in `POST /api/hr/attendance` is already computed server-side (`getDistanceInMeters` in the route itself) — that part is not client-bypassable by tampering with browser JS. The actual weak point is the **input**: `latitude`/`longitude` are read from `navigator.geolocation` in the browser and sent as plain, unsigned values in the request body. An employee can spoof these (devtools, a location-spoofing browser extension, a rooted/jailbroken device, or calling the API directly with fabricated coordinates) and the server has no way to tell real GPS from a faked value.

**Mitigation:**
- Require a tamper-resistant/signed check-in token or device attestation, since server-side distance math alone can't detect spoofed input coordinates.
- Consider IP/network-based corroboration as a secondary signal (not a full fix, but raises the spoofing bar).

---

## RISK-007: Client-Side PDF Invoice Printing Is Browser-Dependent

**Severity:** Low
**Type:** Reliability / UX

**Status:** Partially mitigated 2026-07-22

**Description:**
Invoice printing now uses the shared `src/lib/printUtils.ts` utility with a standardized A4 layout, fixed print margins, and print-color rules. Output still depends on the browser and OS because no actual PDF file is generated.

**Remaining mitigation:**
- Use a server-side PDF library (e.g., Puppeteer, react-pdf) if downloadable, identical PDF output is required.

---

## RISK-008: Hardcoded Superadmin Email

**Severity:** Medium
**Type:** Security / Fork risk

**Status:** Mitigated 2026-07-22

**Description:**
Superadmin access is now determined solely by the persisted `employee_accounts.role_name` value. Email-based bypasses were removed from admin authentication, attendance, and payroll handling.

**Remaining requirement:**
Every superadmin must have an `employee_accounts` row linked through `auth_user_id` and assigned the `superadmin` role.

---

## RISK-009: Schedule Grid Can Silently Clip Overlapping Bookings

**Severity:** Low (mitigated 2026-07-20)
**Type:** Data visibility / UX

**Description:**
The Bookings → Schedule view (`calendarView === "Schedule"`, `src/app/admin/page.tsx`, see DEC-012) fixes every cell to a hard `84px` height with `overflow-hidden` on the inner content wrapper, so that booked cells render at the same height as empty ones. If more than a couple of bookings ever land on the same doctor/slot (whether from a real double-booking, a manual admin entry, or a data edge case — overlap-prevention exists in `api/availability` and `api/reservations` but was not exhaustively re-audited here), the extra booking cards could visually clip and become invisible in this view.

**Mitigation (applied):**
- Cell now shows at most `MAX_VISIBLE_BOOKINGS = 3` cards; any beyond that render as a `+N more` pill instead of clipping silently.
- Clicking `+N more` sets `docFilter` to that cell's doctor, `dateFilter` to that day (`YYYY-MM-DD`), resets `statusFilter`/`typeFilter` to `"All"`, and switches `calendarView` to `"List"` — narrowing to exactly that doctor's bookings on that day.
- A `dateFilter` state was added to `filteredReservations` (previously List/Calendar had no date filter at all) with a date input + clear button in the existing Filter modal, and an active-filter chip row with a "Clear all" button in the List view header — so the filtered state from a `+N more` jump is visible and easy to back out of, not a hidden/stuck state.
- The List view applies the selected date filter, so the jump narrows to that doctor's bookings on the selected day.

---

## PROPOSALS.md Reference

See `PROPOSALS.md` for the proposed plan to extract all Revera-specific values into a
single `client.config.ts` file, making fork-per-client a one-file-edit operation.
