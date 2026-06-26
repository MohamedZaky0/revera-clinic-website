# PROJECT.md — Revera Clinics Website & Admin System

> **Last Updated:** 2026-06-26
> **Audited from:** live source code (no trust placed in stub files)

---

## What Is This System?

A Next.js (App Router) web application serving two purposes:

1. **Public Website** — Revera Clinics' patient-facing marketing site: hero slider, services catalog, about, contact, blog stub, booking modal, and patient auth modal.
2. **Admin Panel** — Internal management interface at `/admin` for the clinic owner/receptionist: bookings management, service/category CRUD, branch management, provider records, and website CMS (page content editing).

---

## Who Uses It?

| Role | Access | What They Do |
|---|---|---|
| Clinic owner / admin | `/admin` (no auth gate currently) | Manage bookings, services, providers, branches, page content |
| Receptionist | `/admin` | Approve/reject/create bookings, view customer list |
| Patients / website visitors | Public pages | Browse services, read about clinic, submit booking request |

---

## Current Deployment Model

- **Single-tenant:** One Supabase project, one deployment — exclusively for Revera Clinics.
- **Hosted on Vercel** (Next.js, App Router).
- **Database:** Supabase (PostgreSQL) — tables: `reservations`, `services`, `categories`, `branches`, `providers`, `page_settings`.
- **No multi-tenancy.** No org/tenant layer in the schema.

---

## Fork-per-Client Plan (Deferred)

For clients #2, #3, etc., the plan is to **duplicate/fork this codebase** per client:
- Separate Supabase project per client
- Edit theme/colors/copy per client
- No shared SaaS infrastructure

This is explicitly NOT a multi-tenant SaaS build. That decision is gated to approximately the 10-client mark. See `DECISIONS.md` for rationale.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth (patient) | Phone/OTP modal — UI-only in current code (OTP not wired to real SMS) |
| Admin auth | None — `/admin` is unprotected |
| i18n | Custom LanguageContext (EN/AR) with translations.ts |
| Icons | lucide-react |
| Fonts | Marcellus (heading), Sora (body) |

---

## Repository Structure

```
src/
  app/
    page.tsx              — Homepage
    layout.tsx            — Root layout + metadata
    admin/page.tsx        — Full admin panel (single file, ~550KB)
    about/page.tsx
    services/page.tsx
    blog/page.tsx
    contact/page.tsx
    api/
      reservations/       — Booking CRUD
      availability/       — Slot availability check
      services/           — Service catalog CRUD
      categories/         — Category CRUD
      branches/           — Branch CRUD
      providers/          — Provider CRUD (Supabase + JSON fallback)
      page-settings/      — CMS content CRUD (Supabase + JSON fallback)
      health/supabase/    — Env/connection health check
  components/             — All public website components
  lib/
    supabaseClient.ts     — Browser Supabase client
    supabaseServer.ts     — Server-side Supabase client (service role)
    services.ts           — Static service/category definitions + slot logic
    serviceStore.ts       — localStorage ↔ Supabase sync for services/categories
    translations.ts       — Full EN/AR translation strings (large file)
    image.ts              — Image compression utility
    utils.ts              — cn() helper
  types/index.ts          — Branch, Translation, ServiceCard, BlogPost types
  contexts/LanguageContext.tsx
data/
  providers.json          — JSON fallback for providers
  page_settings.json      — JSON fallback for page settings
public/images/            — Static images (logo, heroes, services, doctors)
ai_docs/                  — This documentation folder
scratch/                  — Dev scripts (DB seed, test queries)
```

---

## Critical Known Gaps

- Admin panel has **no authentication** — anyone with the URL can access it.
- Patient OTP auth is **simulated** (setTimeout) — no real SMS gateway wired.
- Many admin sections (Prescriptions, Finance, Payroll, Inventory, POS) are **mock UI only** — backed by hardcoded constant arrays, not Supabase.
- localStorage is used as primary storage for services/categories on the admin side (Supabase is secondary/fallback in several places).
