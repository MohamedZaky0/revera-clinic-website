# Revera System

A modern, bilingual (English/Arabic with RTL support) medical clinic website built with Next.js 16, React 19, Tailwind CSS v4, and shadcn/ui.

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **Styling:** Tailwind CSS v4 with oklch design tokens
- **UI Components:** shadcn/ui (Radix primitives)
- **Icons:** Lucide React + custom SVG icons
- **Carousel:** Swiper 12
- **i18n:** Custom context-based EN/AR with RTL layout switching
- **Fonts:** Marcellus (headings) + Sora (body) via Google Fonts

## Prerequisites

- **Node.js >= 24** — check your version with `node --version`
  - Use [nvm](https://github.com/nvm-sh/nvm) or [nvm-windows](https://github.com/coreybutler/nvm-windows): `nvm use` (reads `.nvmrc` automatically)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript type check |
| `npm run check` | Run lint + typecheck + build |

## Project Structure

```
src/
  app/              # Next.js App Router pages
    page.tsx        # Home page
    about/          # About page
    services/       # Services page
    blog/           # Blog page
    contact/        # Contact page
  components/       # All React components
    ui/             # shadcn/ui primitives
    Navbar.tsx
    HeroSlider.tsx
    ServicesSection.tsx
    OurResults.tsx
    HowItWorks.tsx
    AboutSection.tsx
    WhyChooseUs.tsx
    TestimonialsSection.tsx
    AppointmentSection.tsx
    BookingModal.tsx
    AuthModal.tsx
    SiteFooter.tsx
    ... and more
  contexts/
    LanguageContext.tsx   # EN/AR language + RTL switching
  lib/
    translations.ts       # All UI strings in EN and AR
    utils.ts              # cn() utility
  types/
    index.ts              # TypeScript interfaces
public/
  images/           # All static images and SVG icons
```

## Bilingual Support

Language switching is built-in. The `LanguageContext` provides the current language (`en`/`ar`) and a toggle function available to all components. Arabic mode automatically applies RTL layout via the `dir="rtl"` attribute on the root `<html>` element.

## Deployment

The project is configured for Vercel deployment with `output: "standalone"` in `next.config.ts`. Push to GitHub and import the repo in [vercel.com](https://vercel.com) — no extra configuration needed.
