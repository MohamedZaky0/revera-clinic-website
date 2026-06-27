# Revera Clinics — Website & Admin System

A Next.js (App Router) application serving two purposes in one deployment: the patient-facing public website for Revera Clinics, and an internal admin panel for managing bookings, services, staff, and content.

## What's Built

### Public Website (`/`)
- Bilingual (EN/AR with full RTL) homepage, about, services, contact, blog stub
- Hero slider with CMS-editable content
- Booking modal → real write to Supabase `reservations` table
- Patient auth modal (phone/OTP UI — not wired to a real SMS gateway yet)

### Admin Panel (`/admin`)
- Booking management — calendar view, list view, approve/reject, reservation lifecycle (confirmed → started → completed)
- Service catalog — full CRUD, bilingual names, drag-sort, branch pricing
- Category management
- Branch management — full CRUD
- Provider records (doctors/staff)
- Customer profiles — payment tracking (Paid/Left fields), active status derived from recent bookings
- Employee management — OAuth invite flow via Supabase
- Website CMS — edit hero slides (EN/AR) from the admin

> **No auth gate.** `/admin` is currently publicly accessible — anyone with the URL can enter. This is a known open risk (RISK-002).

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui + CSS custom properties |
| Database | Supabase (PostgreSQL) |
| Auth (admin) | None — no login gate exists yet |
| Auth (patient) | Phone/OTP modal — UI only, no SMS backend |
| i18n | Custom `LanguageContext` — EN/AR, RTL/LTR |
| Icons | lucide-react |
| Fonts | Marcellus (headings) + Sora (body) via Google Fonts |
| Deployment | Vercel |

## Prerequisites

- **Node.js >= 24** — check with `node --version`. Use [nvm-windows](https://github.com/coreybutler/nvm-windows): `nvm use` reads `.nvmrc` automatically.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public site, [http://localhost:3000/admin](http://localhost:3000/admin) for the admin panel.

Copy `.env.example` to `.env.local` and fill in your Supabase project URL and keys before running.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run check` | Lint + typecheck + build |

## Project Structure

```
src/
  app/
    page.tsx              Homepage
    layout.tsx            Root layout + metadata
    admin/page.tsx        Full admin panel (single client component)
    about/ services/ blog/ contact/
    api/
      reservations/       Booking CRUD
      availability/       Slot availability check
      services/           Service catalog CRUD
      categories/         Category CRUD
      branches/           Branch CRUD
      providers/          Provider CRUD
      page-settings/      CMS content CRUD
      health/supabase/    Env/connection diagnostics
  components/             Public website UI components
  lib/
    supabaseClient.ts     Browser Supabase client
    supabaseServer.ts     Server-side Supabase client (service role)
    translations.ts       All EN/AR UI copy
    serviceStore.ts       localStorage ↔ Supabase sync for services
    services.ts           Static service definitions + slot logic
    utils.ts              cn() helper
  contexts/
    LanguageContext.tsx   EN/AR state, RTL flag, t() accessor
  types/index.ts
data/                     JSON fallbacks for providers + page settings
public/images/            Static assets (logo, hero images, services)
ai_docs/                  Agent/developer knowledge base (dev branch only)
scratch/                  Dev/seed scripts (not production code)
```

## Supabase Schema

| Table | Purpose |
|---|---|
| `reservations` | All bookings, scoped by `branch_id` |
| `services` | Service catalog with branch pricing |
| `categories` | Service categories |
| `branches` | Clinic branches (topmost scoping unit) |
| `providers` | Doctors and staff |
| `page_settings` | CMS content (JSONB, single `key='home'` row) |

## Known Limitations

- **No admin auth** — `/admin` is publicly accessible (high priority to fix)
- **Patient OTP is simulated** — no real SMS gateway connected
- Many admin sections (Finance, Payroll, Prescriptions, Inventory, POS, Reporting) are mock UI backed by hardcoded data — not connected to Supabase
- Brand colors are defined as CSS variables in `globals.css` but bypassed with raw hex in several components

## Deployment

Configured for Vercel with `output: "standalone"` in `next.config.ts`. Set the following environment variables in Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## For Developers and AI Agents

Read `ai_docs/README.md` first — it is the single source of truth for architecture, data schema, business rules, decisions, and known risks. Do not touch the codebase without reading it.
