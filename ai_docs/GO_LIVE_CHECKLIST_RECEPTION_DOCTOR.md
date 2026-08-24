# Go-Live Checklist — Reception & Doctor Workflows

> **Temporary file — delete once every item below is closed.** Not part of the permanent doc set
> (`RISKS.md`/`DECISIONS.md` stay as the durable record; this is just a punch list to work off of
> and throw away). Written 2026-08-17 after a full audit of `RISKS.md` (58 entries),
> `PROPOSALS.md`, `DECISIONS.md`, and `DB_SCHEMA.md` scoped specifically to what Reception and
> Doctor touch day to day — not the whole admin panel.
>
> **Headline finding: no blocking risk was found.** Every risk that could cost money, lose data, or
> dead-end a receptionist/doctor (RISK-010 through RISK-058) is already resolved and verified. What
> follows is real but smaller — three quick items worth closing before launch, and a short list of
> things to know about for week one.
>
> **Re-verified 2026-08-24.** Item 1 unchanged (still dead code). Item 2 re-checked live against the
> database — still not done, plus a new related finding (branch data hygiene, below). Item 3 stays
> resolved. Two risks not in scope of the original 2026-08-17 audit were found and fixed since:
> **RISK-063** (four HR endpoints accepted any authenticated session, not just staff — found
> 2026-08-19, fixed 2026-08-24) and the **doctor/reception clinical-notes split** (previously one
> shared `notes` field with string-concatenated tags — now two dedicated `doctor_notes`/
> `reception_notes` columns, Brief 33, fixed 2026-08-24). Neither blocks launch today — both are
> already closed.

---

## Before launch (3 items)

### 1. `activeNav === "Point of Sale"` — dead code, not a hidden button

**Corrected finding** (the first version of this audit assumed it needed hiding — verified live in
the browser and by grep that it's actually unreachable, not just hard to find):

- `src/app/admin/page.tsx:10457` — the JSX block (`{activeNav === "Point of Sale" && (...)}`,
  ~130 lines) uses a hardcoded `MOCK_PRODUCTS` array, a `posCart` that's never persisted, and
  "Complete Payment" is a bare `alert()` — confirmed dead/fake.
- **But there is no sidebar entry, no button, and no `setActiveNav("Point of Sale")` call anywhere
  in the codebase.** Grepped `SIDEBAR_ITEMS` (`page.tsx:192`) and every `setActiveNav(` call site —
  zero matches. Nothing in the running app can ever set `activeNav` to that string, so this screen
  is unreachable through any normal navigation path. This matches what you saw — there genuinely is
  no button to find.

**What to do — pick one, both are safe:**
- **(a) Leave it.** Zero risk: no staff member can ever reach it, so it can't confuse anyone or
  cause a silent failure. Purely dead code sitting in the bundle.
- **(b) Delete it** (recommended if you want the codebase honest, not urgent for launch): remove
  the JSX block at `page.tsx:10457` and its now-unnecessary reference in the `activeNav === ...`
  condition at `page.tsx:3694`. Real cleanup, not a functional fix — the real, working
  `product_sales`-backed "Sell Product" flow lives inside Patients → Customer Profile and is
  unaffected either way.

### 2. New Cairo branch's real working hours were never entered

**RISK-053 — re-checked live against the database 2026-08-24, still not done.**
`service_hours` is `null` for **every** branch row, not just New Cairo:

| Branch | `status` | `service_hours` |
|---|---|---|
| New Cairo Branch | `inactive` | `null` |
| Sheikh Zayed Branch | `active` | `null` |
| home | `active` | `null` |
| Italy | `active` | `null` |

Not a code bug — the system runs on a permissive hardcoded default (09:00–20:00 every day)
wherever `service_hours` is `null`. Booking/approval logic works correctly against whatever is
configured; it's just not configured with real hours for any branch yet.

**What to do:** Admin → Settings → Service Hours → enter the actual opening hours and closed days
for **Sheikh Zayed Branch** at minimum (it's the only real, active branch right now), and for New
Cairo before switching it active.

**New finding, same query — branch data hygiene:** two rows named **"home"** and **"Italy"** exist
with `status: "active"`. `GET /api/branches` (`src/app/api/branches/route.ts:7-19`) returns every
row with no status filter, and the public `BookingModal.tsx:291` does
`filter(b => b.status === "active")` — so **"home" and "Italy" currently appear as selectable
branches in the live public booking flow**, alongside Sheikh Zayed. Meanwhile **New Cairo Branch is
`status: "inactive"`**, so it does *not* appear to patients at all right now (unclear whether that's
deliberate — pending its hours being set — or an oversight; worth confirming either way, not
something to fix silently). "home"/"Italy" look like leftover test/seed data and, if so, should be
set `inactive` (or deleted) via Admin → Settings → Branches before launch so a real patient can't
book against them.

### 3. Doc drift — already fixed, no action needed

`DECISIONS.md`/`DB_SCHEMA.md` said DEC-042's `reservation_products` table was "pending migration
application" — stale; it's actually applied and live-verified. Fixed in commit `ac8ecc1`. Listed
here only so it doesn't get re-flagged by a future audit pass.

---

## Worth knowing for week one (not blocking)

These won't stop you launching — they're things a receptionist or doctor will notice within the
first few days of real use.

### Prescriptions: two editors, not synced (RISK-045, partial)

There's an inline prescription writer inside the doctor's Ongoing Session screen
(`DoctorOngoingSessionTab`) and a separate standalone prescription modal
(`DoctorPrescriptionModal`). They hold **separate local state** — filling one does not populate the
other. RISK-045's 2026-08-16 fix addressed a false-success alert on save failure, not this. A
doctor who starts a prescription in one and then opens the other could reasonably think they lost
their work, or end up unsure which one is "the real one" for that visit.

**Recommendation:** decide product-side which one is canonical (or whether both are meant to exist
for different situations), and either remove the redundant one or make them share state. Not code
you need before launch, but worth a decision before it confuses a real doctor mid-shift.

### No way to settle an old debt outside a new booking (RISK-012)

A returning patient's `outstanding` balance can decrease correctly now (it's delta-based and
idempotent — the original "debt only ever grows" bug is fixed), but there's still no standalone
admin screen for "patient walks in and pays down what they owe" without it being tied to a new
booking's checkout. In practice, debt collection outside of booking flow isn't really supported
yet.

### "Cancellation Window (Hours)" setting doesn't do anything (RISK-029)

Booking Settings has a "Cancellation Window (Hours)" field whose description implies a late
cancellation forfeits the deposit — nothing in the code actually reads that setting.
Cancellations always refund in full regardless of timing. Not a money-loss bug (refunding is the
safer default), just a setting that looks like a policy control but isn't wired to anything —
worth turning into a real control or removing the misleading field.

### Arabic / admin-panel refactor is mid-flight (informational, not a defect)

Separate, already-tracked effort (`ADMIN_REFACTOR_AND_I18N_PLAN.md`, `WINDSURF_BRIEFS.md`) —
Bookings/New Booking are already componentized, Patients is being split into pieces and translated
one at a time. The English-language product works fully regardless of where this effort is —
Arabic support in specific admin screens is a rollout in progress, not something blocking an
English go-live.

---

## Explicitly checked and NOT a Reception/Doctor concern

Scoped out during the audit, listed here so it's clear they were checked, not skipped:

- Finance module internals (P&L, depreciation, capacity/optimization reporting, ~4,000 lines of
  dead Finance UI per RISK-017) — Finance-only, doesn't touch Reception/Doctor's daily path.
- Marketing/CMS content editors (Before/After Results, FAQ, public-site translations) — public
  marketing site management, not a clinical/reception tool.
- Packages/Promotions marketing-facing display — the checkout-enforced discount logic (RISK-030)
  is real and working; the marketing display layer on top is a pricing concern, not Reception's.
- RLS "allow all" policy gaps (RISK-019 residual) — every access path already goes through the
  service-role key regardless, so this doesn't change what Reception/Doctor actually experience.
  It's a defense-in-depth item, not something visible in daily use.
- PROPOSAL-001 (fork-per-client config centralization) — relevant when forking for client #2, not
  to whether this clinic can go live today.
