# PRODUCT_SPECS.md: Product Specification for Marketing & Sales

> **Audience:** Marketing agents, sales agents, and anyone writing external copy or pitching the product.
> **Not for:** developers. Engineering truth lives in `PROJECT.md`, `ARCHITECTURE.md`, `DB_SCHEMA.md`.
> **Last verified against the code:** 2026-09-24 (branch `dev`).
> **Product name:** not chosen yet. Every place this file says **[PRODUCT]** is a placeholder.
> Do not invent a name, and do not use "Revera" as the product name (see §11).

---

## 0. Rules for any agent using this file (read first)

1. **Every capability below has a status tag.** Only sell what the tag allows:

   | Tag | Meaning | What you may say |
   |---|---|---|
   | `LIVE` | Built, wired to the real database, in daily use or ready for it | Sell it as a current feature |
   | `BETA` | Built and working, but still being hardened or not yet fully verified live | "Available now, being refined." Don't make it the headline promise |
   | `DEMO` | A screen exists but runs on sample data, with no real backend | **Never present as working.** You may call it "on the roadmap" |
   | `PLANNED` | Decided direction, not built | "On the roadmap." No dates unless the owner gives one |

2. **Never promise legal or regulatory compliance** (ZATCA, Egypt e-invoicing, HIPAA, GDPR, Saudi PDPL, MOH licensing).
   None of these are certified. See §8.
3. **Never quote a price.** The commercial model is still under discussion (§10).
4. **Never name a client or show client data** without the owner's written approval. That includes Revera, the reference clinic.
5. If a prospect asks about something not in this file, the answer is "let me confirm with the team." Don't guess.

---

## 1. One-line positioning

**[PRODUCT] is an all-in-one operating system for aesthetic, dermatology and laser clinics. It runs the public website, bookings, reception, the doctor's session, packages, laser pulses, inventory, HR, and real management-accounting finance, bilingual Arabic/English, on each clinic's own dedicated database.**

Short versions:
- *"From the website booking to the monthly P&L, one system."*
- *"Built for how aesthetic clinics actually make money: packages, laser pulses, and doctor commissions."*

---

## 2. Target market (ICP)

| | |
|---|---|
| **Segment** | Aesthetic / cosmetic dermatology / laser clinics |
| **Geography** | Egypt first, then the Gulf (Saudi Arabia, UAE) |
| **Size** | 1 to about 5 branches, roughly 3 to 30 staff. The system is multi-branch by design |
| **Buyer** | Clinic owner (often a doctor-owner) or the general manager |
| **Daily users** | Receptionists, doctors, branch managers, accountant or finance person |
| **Trigger to buy** | Growing past one branch; losing track of packages and prepaid money; doesn't know true profit per service or per doctor; laser device costs not tracked; staff attendance and payroll done in Excel or on paper |

**Who it is not for (today):** hospitals, insurance-heavy practices (no insurance claims module), and clinics that need a native patient mobile app.

---

## 3. Problems it solves (in the buyer's language)

| Pain the owner feels | How [PRODUCT] answers it |
|---|---|
| "I don't know if I actually make money on each service." | Per-service margin after materials, doctor commission and laser pulse cost. Per-doctor and per-branch P&L |
| "Packages are a mess. Who paid, who used what, what's left?" | Packages are first-class: sold, tracked per session or per pulse, with expiry, extension, and **deferred revenue** (prepaid money isn't counted as profit until the session is delivered) |
| "Laser pulses disappear. The device counter doesn't match billing." | Laser pulse engine: pay per service, per pulse, or from a pulses package. Every pulse logged against the device and the patient |
| "Reception undercharges, or forgets the patient owes money." | Checkout shows the full invoice, wallet credit and outstanding debt. Every payment lands in a ledger |
| "Patients' prepaid money and debts are on paper." | Patient wallet (credit) and outstanding balance, with full transaction history |
| "Stock runs out, and I don't know what each session consumes." | Service recipes auto-deduct consumables at checkout. Low-stock alerts, suppliers, purchases |
| "Staff attendance and payroll are guesswork." | GPS-verified shift check-in, leaves, performance reviews, monthly payroll. Doctors get fixed pay, commission, or both |
| "I can't see the business from my phone." | Fully responsive admin, reception and doctor views |
| "My website is just a brochure." | Website with a live booking flow, service catalog, package and promotion pages, all editable from the admin |

---

## 4. Capability map

### 4.1 Public website & online booking

| Capability | Status |
|---|---|
| Bilingual (Arabic RTL / English) marketing website: home, services, about, contact | `LIVE` |
| Content editable from admin (hero slides, page texts, service catalog, visibility toggles) | `LIVE` |
| Dedicated booking page `/book` plus a "Quick Book" popup: pick service, date and time from **real availability** | `LIVE` |
| Availability respects branch opening hours, doctor shifts, closed days, and already-booked slots | `LIVE` |
| Public packages page (clinic chooses which packages are shown) | `LIVE` |
| Promotions (per-branch discounts), actually enforced at checkout and recorded on the invoice | `LIVE` |
| Patient login by phone OTP; patient profile with wallet and visit history | `BETA`, off by default (admin toggle) |
| WhatsApp contact buttons (click-to-chat links) | `LIVE` |
| Blog | `DEMO` (stub page) |

### 4.2 Bookings & scheduling

| Capability | Status |
|---|---|
| Full booking lifecycle: pending, approved, confirmed, checked in, in session, completed (plus cancelled, no-show, postponed) | `LIVE` |
| Calendar view, pending-approvals queue, searchable all-appointments directory | `LIVE` |
| Staff "New Booking" screen with patient auto-detection by phone, and new patient intake in the same step | `LIVE` |
| Server-side guards: no booking on closed days, past times, or taken slots | `LIVE` |
| Multi-branch, multi-room scheduling (rooms auto-assigned) | `LIVE` |
| Doctor follow-up reminders: the doctor sets a follow-up date, reception is alerted days before and can convert it to a booking in one click | `LIVE` |
| Historical-booking intake: enter a patient's past visits and balances when onboarding a clinic | `LIVE` |
| Booking origin tracking (website vs. staff) | `LIVE` |
| Automated SMS or WhatsApp reminders to patients | `PLANNED` |
| Waitlist | `PLANNED` |

### 4.3 Reception workspace

| Capability | Status |
|---|---|
| Reception dashboard: today's bookings, shift timer, alerts (low stock, device maintenance) | `LIVE` |
| Shift start/end with optional GPS geofence check | `LIVE` |
| Checkout and settlement: itemised invoice, deposit, wallet use, partial payment, debt tracking | `LIVE` |
| Printable invoices (PDF, bilingual) | `LIVE` |
| Laser pulse deficit handling at checkout: when a package runs short, reception chooses to sell a new package or bill the extra pulses | `BETA` (just shipped) |
| Mid-visit service change with automatic price recalculation, keeping deposits already paid | `LIVE` |

### 4.4 Doctor portal

| Capability | Status |
|---|---|
| Own schedule (month/day), today's queue, one-click "Start Treatment" | `LIVE` |
| Live session screen: record delivered laser pulses, extra services, consumables used | `LIVE` |
| Medical intake forms: clinic-built templates mapped per service, required on the first visit only | `LIVE` |
| Digital prescriptions: write, print (branded PDF), send via WhatsApp link | `LIVE` |
| Patient history drawer: past visits, prescriptions, uploaded lab/scan reports | `LIVE` |
| Mobile-first layout (bottom nav, works on a phone between patients) | `LIVE` |
| Before/after photos, treatment plans, consultation notes | `DEMO` |

### 4.5 Patient records (CRM)

| Capability | Status |
|---|---|
| Patient profile: demographics, contact, address, referral source | `LIVE` |
| Financial summary: total spent, wallet credit, outstanding debt | `LIVE` |
| Per-patient transaction history, packages owned, products purchased | `LIVE` |
| Medical intake, prescriptions, reports, all in one drawer (also visible to reception if permitted) | `LIVE` |
| Duplicate-patient prevention (phone-number normalisation) | `LIVE` |
| Import/export of patient lists | `LIVE` |

### 4.6 Laser pulse engine (key differentiator)

Built specifically for laser clinics. Most generic clinic systems don't have this.

| Capability | Status |
|---|---|
| Three ways to charge a laser session: **fixed service price**, **per pulse** (delivered pulses × rate), or **from a pulses package** | `LIVE` |
| Pulses packages (e.g. 5,000 / 10,000 pulses) sold, tracked per patient, with expiry | `LIVE` |
| Every session logs pulses delivered, doctor, device, and treatment area. Lifetime pulse history per patient | `LIVE` |
| Device pulse counters with maintenance warnings and reset history | `LIVE` |
| Cost-per-pulse (lamp/handpiece cost ÷ rated pulses) feeds true session profit | `LIVE` |
| Default price per pulse configurable in settings | `LIVE` |
| Package balance moved to fully transactional storage (safer under heavy concurrent use) | `PLANNED` (in the current engineering queue) |

### 4.7 Packages & promotions

| Capability | Status |
|---|---|
| Session packages (e.g. 6 sessions of X) and pulses packages | `LIVE` |
| Sell at booking, at checkout, or standalone. Partial payment supported | `LIVE` |
| Redemption only at checkout, so sessions can't be "used" without a visit | `LIVE` |
| Deferred revenue: prepaid package money is recognised as revenue per session delivered | `LIVE` |
| Package expiry and extension | `LIVE` |
| Package profitability report | `LIVE` |
| Per-branch promotions applied automatically at checkout | `LIVE` |

### 4.8 Inventory, devices & POS

| Capability | Status |
|---|---|
| Product catalog with role: retail, consumable, or both | `LIVE` |
| Service recipes (bill of materials): consumables auto-deducted per session, editable at the moment of use | `LIVE` |
| Stock movements ledger (not just a number that gets overwritten) | `LIVE` |
| Suppliers and purchase recording (updates stock and cost) | `LIVE` |
| Retail sales (POS) to patients, with invoice | `LIVE` |
| Device register with pulse counters, maintenance thresholds, audit log | `LIVE` |
| Low-stock, expiry and maintenance alerts | `LIVE` |

### 4.9 Finance: management accounting in clinic language

Designed for a **non-accountant owner**. It isn't bookkeeping (no chart of accounts, no journal entries). It answers "where is my money and what is actually profitable."

| Capability | Status |
|---|---|
| Invoice / payment / wallet ledger behind every booking, package and product sale | `LIVE` |
| Expenses (one-off and recurring), fixed assets with automatic monthly **depreciation (الإهلاك)**, loans with interest/principal schedules, budgets | `LIVE` |
| Reports: monthly P&L, cash flow, service margin, doctor P&L, branch P&L, receivables aging, budget vs. actual, commission payouts, package profitability, no-show cost, new vs. returning patients, trend | `LIVE` |
| Break-even figure on the P&L | `LIVE` |
| **Capacity & service-mix optimisation:** room/doctor utilisation, bottleneck, and which services earn the most per minute of scarce room or doctor time | `BETA` |
| Transactions dashboard: filters, CSV export, manual refunds / service charges / purchases with audit log | `LIVE` |
| Finance visibility is a separate, revocable permission, so branch managers don't automatically see salaries or margins | `LIVE` |
| Opening-balance import for a new clinic (day-one cash, stock, debts, wallet credit, undelivered packages) | `PLANNED` |
| General "Reports & Analytics" page (separate from Finance) | `DEMO` (partly sample data; use the Finance reports in demos) |

**The insight to lead with:** a 60%-margin service that ties up the only laser room for two hours can earn less than a 40%-margin service that takes twenty minutes. [PRODUCT] ranks services by **profit per minute of the bottleneck resource**, not by margin %.

### 4.10 HR & payroll

| Capability | Status |
|---|---|
| Employee accounts with email invites or direct onboarding | `LIVE` |
| Weekly shift schedules (multi-shift days) for doctors and staff | `LIVE` |
| GPS-geofenced attendance, missed-check-in alerts | `LIVE` |
| Leave requests, performance reviews, administrative notes | `LIVE` |
| Monthly payroll: staff salaries; doctors paid fixed, commission, or both (with a configurable commission base) | `LIVE` |

### 4.11 Access control & multi-branch

| Capability | Status |
|---|---|
| Role management with 100+ action-level permissions across 15 areas (custom roles supported) | `LIVE` |
| Separate staff portals: `/reception`, `/doctor`, `/admin`, custom role URLs | `LIVE` |
| Branch-level scoping: pricing, hours, rooms, stock, P&L per branch | `LIVE` |
| Owner-only protections: locked owner role, soft delete vs. permanent delete | `LIVE` |

### 4.12 AI assistants

| Capability | Status |
|---|---|
| **Reception assistant (internal):** answers staff questions from the clinic's own manual and policies (with cited sections), plus live read-only lookups of services, prices, doctors, availability, packages, products, branches and terms. Guardrails: it never sees patient, payment or salary data | `BETA` (in development: data endpoints and knowledge-base storage built, automation workflow in progress) |
| **Owner/Admin assistant:** ask questions about the clinic's data in plain Arabic or English ("which doctor brought the most profit last month?"), get decision support, and a guided tour of the system | `PLANNED` |

### 4.13 Customer support helpdesk

| Capability | Status |
|---|---|
| Ticket inbox (WhatsApp/call/web channels, priorities, statuses) | `DEMO` (sample tickets only) |

---

## 5. Differentiators (what to emphasise)

1. **Built for aesthetic-clinic economics**: laser pulses, pulses packages, deferred package revenue, doctor commission, consumable recipes. Generic clinic systems treat these as afterthoughts.
2. **Real profitability, not just revenue.** Per service, per doctor, per branch, after materials, commission, pulse cost and depreciation.
3. **One system end to end.** Website, booking, reception, doctor, inventory, HR, finance. No integrations to maintain between five tools.
4. **Arabic-first, not translated as an afterthought.** RTL layouts, bilingual invoices and prescriptions.
5. **Each clinic gets its own dedicated database and deployment** (§6). The clinic's data is never mixed with another clinic's.
6. **Branded as the clinic's own.** The website and invoices carry the clinic's name, colours and logo.

---

## 6. Delivery model

- **Dedicated instance per clinic:** its own database, its own website/admin deployment, its own branding. This is deliberate: full data isolation and freedom to customise per clinic.
- Hosted on managed cloud infrastructure (Vercel + Supabase/PostgreSQL). Nothing to install on the clinic's computers. Works in any modern browser, desktop or mobile.
- **Onboarding** = branding and content, services and prices, branches/rooms/devices, staff and roles, importing existing patients and their past visits/balances.
- **Future:** once there are about 10 clinics, the plan is to move to a shared multi-tenant SaaS platform, which will allow faster self-serve onboarding. Don't pitch self-serve signup today.

---

## 7. Technology (for credibility, keep it short in copy)

- Modern web stack (Next.js, TypeScript), PostgreSQL database, managed hosting with automatic scaling.
- Server-side authorisation on sensitive routes, row-level security on the database, role-based permissions.
- Automated test suite covering API routes and all money logic, plus written manual test checklists per feature.
- Money handled as ledgers (invoices, payments, wallet transactions), with prices and costs snapshotted at sale time, so reprinting an old invoice never changes its total.

---

## 8. Known gaps and objection handling

| Prospect asks about | Honest answer |
|---|---|
| **Saudi ZATCA e-invoicing (Fatoorah) / Egypt ETA e-invoice / e-receipt** | Not built yet. It is a **prerequisite before selling in KSA** and should be confirmed for Egypt. Prices are stored tax-inclusive with a tax rate per line, so the data foundation exists. Don't promise a date |
| **Currencies / VAT for the Gulf** | Built around EGP today. SAR/AED and VAT configuration are needed for the Gulf. Treat as pre-launch work |
| Automated WhatsApp/SMS reminders | Not yet. Today WhatsApp is click-to-send from the staff screen. On the roadmap |
| Online payment / card on website | Not built. Payments are recorded at the clinic |
| Insurance claims | Not supported. Out of scope for the target segment |
| Patient mobile app | No native app. The website and patient profile are mobile-friendly |
| Before/after photos | Not yet (the screen is a demo) |
| Data migration from our old system / Excel | Patients and historical visits/balances can be imported. The full opening-balance import is on the roadmap |
| Data ownership | The clinic's data sits in its own dedicated database |
| Compliance certifications (HIPAA, ISO, PDPL) | None held. Don't claim any |

---

## 9. Future vision

Direction, in rough priority order. None of this is dated; all of it is `PLANNED`.

1. **AI layer:** reception assistant (in progress), then an owner/admin assistant that explains the data and recommends decisions, in Arabic or English.
2. **Patient communication:** automated WhatsApp confirmations, reminders, follow-ups, post-treatment care messages.
3. **Gulf readiness:** ZATCA e-invoicing, VAT, multi-currency.
4. **Growth analytics:** marketing spend per channel against the referral source already captured on every patient, giving customer acquisition cost and ROI per channel. Plus "refused demand" (patients turned away for lack of a slot) as the basis for expansion decisions.
5. **Clinical depth:** before/after photo gallery, treatment plans, consultation notes.
6. **Online payments and deposits** on the booking page.
7. **Multi-tenant SaaS** at about 10 clinics: faster onboarding and lower cost per clinic.

---

## 10. Commercial model: under discussion (do not quote)

**Owner's current leaning:** yearly subscription.

**Market reference points** (public 2026 figures, international aesthetic-clinic software):

| Product | Public pricing |
|---|---|
| Zenoti (enterprise, multi-location) | from about $300 to $600 per location per month, plus $2,000 to $5,000 implementation |
| Pabau | from about $59 to $69 per month |
| Aesthetic Record | from about $15 per user per month |

Sources: [Pabau on Zenoti pricing](https://pabau.com/blog/zenoti-pricing/), [Pabau on Aesthetic Record pricing](https://pabau.com/blog/aesthetic-record-pricing/), [Software Advice: Aesthetic Record](https://www.softwareadvice.com/product/475261-Aesthetic-Record/).

**Local competitors (Egypt / Gulf).** None of these publish prices. Get quotes through demo calls and record them here.

| Competitor | Focus | Public price |
|---|---|---|
| Mediflow | Clinic management | Not published |
| Mediolize | Clinic management (Egypt) | Not published |
| Dentolize | Dental-only (same family of names as Mediolize) | Not published |
| Clinicea | Multi-specialty EMR, present in Egypt and KSA | Not published |
| Clinit, Clinicy | KSA clinic systems (SAR billing) | Not published |
| ClinicGateway | Egypt/Gulf clinic management | Claims from 2,500 EGP/month, no setup fee |

The only Egypt price range found publicly is from ClinicGateway's own blog, so treat it as a competitor's claim: about 2,500 EGP/month at the entry level, 5,000 to 8,000 EGP/month for mid-market, and 8,000 to 15,000+ EGP/month for international enterprise systems ([ClinicGateway, Egypt 2026 guide](https://clinicgateway.ae/blog/best-clinic-management-software-egypt-2025/)). The same source lists **Egyptian Tax Authority e-receipt integration** as a buying criterion in Egypt, which reinforces the gap in §8.

**Positioning against these:** most local systems are general-purpose EMR/booking tools, and Dentolize is dental-only. Our angle is aesthetic/laser-specific economics (pulses, packages, deferred revenue, per-minute profitability) plus real finance. Verify each competitor's feature list in a demo before claiming they lack something.

**Proposed structure (engineering-side recommendation, not approved):**

1. **One-time onboarding fee.** Covers setup, branding, data import and training. It is real work under the dedicated-instance model, and it filters out non-serious buyers.
2. **Annual subscription priced per branch**, paid upfront. Branch count is the value driver (more rooms, doctors and revenue) and is easy for the buyer to understand. A monthly option can exist at a higher effective price.
3. **Tiers:**
   - *Core:* website, booking, reception, doctor portal, patients, packages, laser engine, inventory.
   - *Business:* adds Finance reports, HR and payroll, multi-branch.
   - *AI add-on:* the assistants, priced separately since they carry per-use AI costs.
4. **Separate price lists for Egypt (EGP) and the Gulf (SAR/AED).** Price to local purchasing power, not one global dollar price.

Actual numbers need: the per-clinic infrastructure cost, the target margin, and competitor quotes from the field.

---

## 11. Brand and messaging guardrails

- **[PRODUCT] ≠ Revera.** Revera Clinics is the first (reference) client, not the product. It may be mentioned as a reference or case study **only with written approval**.
- Don't show screenshots containing real patient names or phone numbers. Use demo data.
- Tone: confident, practical, owner-to-owner. Talk about money, time and control, not technology.
- Arabic copy: Egyptian Arabic for Egypt, a more neutral Gulf-friendly Arabic for KSA/UAE.
- Don't use the words "AI-powered" as a headline claim until the assistants are `LIVE`.

---

## 12. Glossary

| Term | Meaning |
|---|---|
| Laser pulse (نبضة) | One shot of a laser device. Laser sessions are often priced or packaged by pulse count |
| Pulses package (باقة نبضات) | Prepaid bundle of pulses (e.g. 10,000) consumed across sessions |
| Session package (باقة جلسات) | Prepaid bundle of N sessions of a service |
| Deficit (عجز الباقة) | When a session needs more pulses than the package has left |
| Deferred revenue (إيراد مؤجل) | Package money received but not yet earned, because the sessions aren't delivered yet |
| Wallet (محفظة) | Patient credit held by the clinic (overpayments, deposits) |
| Outstanding (مديونية) | Money the patient owes the clinic |
| Depreciation (الإهلاك) | Spreading a device's purchase cost over its useful life |
| Recipe / BOM (مستهلكات الخدمة) | Standard consumables a service uses per session |
| Contribution margin | Price minus materials, commission and pulse cost, before fixed overheads |
| Bottleneck | Whichever is scarcer on a given day, room time or doctor time. It caps revenue |

---

## 13. Open questions for the owner

1. Product name and domain.
2. Final commercial model and price points (§10).
3. Which Revera results (if any) may be used publicly as a case study.
4. Target date and scope for Gulf readiness (ZATCA, VAT, currency).
5. Which roadmap items can be given approximate dates to prospects.
