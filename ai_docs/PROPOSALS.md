# PROPOSALS.md — Proposed Refactors

> **Status:** PROPOSED — review before executing. Do not implement without explicit approval.

---

## PROPOSAL-001: Centralize Client-Specific Config for Fork-per-Client

**Problem:**
Forking this repo for client #2 currently requires finding and replacing Revera-specific values
scattered across 20+ files. This is error-prone and slow. See `RISKS.md` → RISK-001 for the
full audit of every hardcoded location.

**Goal:**
"Copy repo, edit one file, point at new Supabase project" — that's the entire fork setup.

**Do NOT execute this refactor without review. This is a plan only.**

---

### What Would Move: `src/config/client.ts` (new file)

```ts
// src/config/client.ts
// Edit this file when forking for a new client.

export const CLIENT = {
  name: "Revera Clinics",
  nameShort: "Revera",

  // Used in page <head> metadata
  tagline: "Medical Center",
  metaDescription: "Expert dermatology and cosmetic surgery services...",

  // Contact
  phoneDisplay: "(+20) 01035595691",
  phoneTel: "+201035595691",
  whatsappNumber: "201035595691",
  whatsappGreeting: "Hello Revera, I'd love to schedule a consultation at your New Cairo branch. Please let me know your earliest availability. Thank you.",
  whatsappBookingGreeting: (serviceName: string) =>
    `Hello Revera, I'm interested in booking "${serviceName}". Please let me know your availability at your New Cairo branch. Thank you.`,

  // Brand assets
  logoPath: "/images/main_logo.png",
  faviconPath: "/icon.png",

  // Supabase — these stay in env vars (already clean, no change needed)
  // NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

  // localStorage key prefix (prevents collision if same browser hits multiple forks)
  storagePrefix: "revera",
} as const;
```

---

### What Moves to `globals.css` (already partially done — gap to close)

Brand colors are already defined as CSS custom properties in `globals.css`. The remaining
work is to remove all inline raw hex values from components and replace with CSS var references:

| Raw hex in component | Replace with |
|---|---|
| `#414E36` (Tailwind JIT `bg-[#414E36]`, `text-[#414E36]`) | `bg-[var(--cr-primary)]` or `text-[var(--cr-primary)]` |
| `#C4AE7C` (Tailwind JIT `bg-[#C4AE7C]`) | `bg-[var(--cr-accent)]` |
| Inline `style={{ color: "#414E36" }}` | `style={{ color: "var(--cr-primary)" }}` |

Files to update (from audit):
- `src/components/AboutSection.tsx` (lines 146, 176, 181, 239, 250)
- `src/components/AboutPageIntro.tsx` (lines 257, 373, 383)
- `src/components/BookingModal.tsx` (lines 637, 648)
- `src/app/admin/page.tsx` (lines 104–107 and throughout)

After this change, a client with different brand colors only needs to edit the CSS custom
properties block in `globals.css`.

---

### What Stays in `translations.ts` (by design)

All UI copy strings (clinic description, hero text, testimonials, FAQs, service descriptions)
live in `translations.ts`. This is correct — they are content, not config. When forking:
- Replace all occurrences of "Revera" within translation strings
- Update service category names to match the new client's specialties
- Update the clinic description paragraphs

This is expected work per fork, but it's contained in one file.

---

### What Gets Updated in `src/lib/serviceStore.ts`

The three localStorage keys are prefixed with `revera_`:
```ts
const TOGGLES_KEY = "revera_service_toggles";
const SERVICES_KEY = "revera_dynamic_services";
const CATEGORIES_KEY = "revera_dynamic_categories";
```

After PROPOSAL-001, these would be derived from `CLIENT.storagePrefix`:
```ts
const TOGGLES_KEY = `${CLIENT.storagePrefix}_service_toggles`;
```

---

### Page `<head>` Metadata

Each page file hardcodes its own `export const metadata`. After PROPOSAL-001, these would
import from `CLIENT`:

```ts
// Before (src/app/layout.tsx:21)
title: "Revera Clinics - Medical Center"

// After
title: `${CLIENT.name} - ${CLIENT.tagline}`
```

Affected files:
- `src/app/layout.tsx`
- `src/app/services/page.tsx`
- `src/app/contact/page.tsx`
- `src/app/blog/page.tsx`
- `src/app/about/page.tsx`

---

### WhatsApp Links in Components

All `wa.me` links and message strings reference the phone number and clinic name inline.
After PROPOSAL-001, they would read from `CLIENT`:

```ts
// Before
window.open(`https://wa.me/201035595691?text=${msg}`, '_blank');

// After
window.open(`https://wa.me/${CLIENT.whatsappNumber}?text=${msg}`, '_blank');
```

Affected files: `ServicesSection.tsx`, `HomeServicesSection.tsx`, `HeroSlider.tsx`, `Navbar.tsx`

---

### Summary: Files to Touch in This Refactor

| File | Change |
|---|---|
| `src/config/client.ts` | **Create new** — all client-specific values |
| `src/app/globals.css` | No structural change — brand colors already here |
| `src/app/layout.tsx` | Import CLIENT for metadata |
| `src/app/*/page.tsx` (5 files) | Import CLIENT for page metadata |
| `src/components/Navbar.tsx` | Import CLIENT for phone, WhatsApp links, logo path |
| `src/components/HeroSlider.tsx` | Import CLIENT for WhatsApp link |
| `src/components/ServicesSection.tsx` | Import CLIENT for WhatsApp links |
| `src/components/HomeServicesSection.tsx` | Import CLIENT for WhatsApp links |
| `src/components/SiteFooter.tsx` | Import CLIENT for phone |
| `src/components/AuthModal.tsx` | Import CLIENT for logo path |
| `src/components/BookingModal.tsx` | Import CLIENT for logo path |
| `src/components/AboutSection.tsx` | Import CLIENT for logo path; fix inline hex colors |
| `src/components/AboutPageIntro.tsx` | Fix inline hex colors |
| `src/lib/serviceStore.ts` | Import CLIENT for storage key prefix |
| `src/app/admin/page.tsx` | Fix inline hex colors; import CLIENT for phone fallbacks |

**Not included in this refactor:**
- `translations.ts` copy strings (expected per-fork manual edit)
- Service category content in `services.ts` (expected per-fork manual edit)
- Images in `public/images/` (replaced by dropping new assets into the fork)

---

### Result After This Refactor

Forking for client #2:
1. `cp -r revera-website-frontend client2-website-frontend`
2. Edit `src/config/client.ts` — update name, phone, WhatsApp, logo path
3. Edit `src/app/globals.css` — update the 2 hex values in the `:root` block
4. Edit `src/lib/translations.ts` — replace clinic name and copy (one file)
5. Edit `src/lib/services.ts` — replace service categories (one file)
6. Drop new logo into `public/images/`
7. Point `.env.local` at new Supabase project
8. Deploy
