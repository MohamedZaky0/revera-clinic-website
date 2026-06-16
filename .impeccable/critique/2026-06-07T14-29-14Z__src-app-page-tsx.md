---
timestamp: 2026-06-07T14-29-14Z
slug: src-app-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No loading/progress feedback in booking flow; hero has no time-indicator for autoplay |
| 2 | Match System / Real World | 3 | Language is patient-appropriate; "Osteopathy & Nutrition" category may be opaque to average visitors |
| 3 | User Control and Freedom | 2 | No "back to all categories" from service grid; Swiper has no back nav |
| 4 | Consistency and Standards | 3 | System is mostly coherent; muted text achieved via opacity: 0.75 in some places and color token in others |
| 5 | Error Prevention | 2 | No visible form validation strategy; booking has no confirmation step |
| 6 | Recognition Rather Than Recall | 2 | Every service card renders the same placeholder image — visual differentiation is completely broken |
| 7 | Flexibility and Efficiency | 1 | Two required clicks before seeing any service; no keyboard paths |
| 8 | Aesthetic and Minimalist Design | 3 | Strong restraint overall; hero at 155svh pushes all content into excessive scroll |
| 9 | Error Recovery | 1 | No error states visible; booking form recovery paths undesigned |
| 10 | Help and Documentation | 1 | No FAQ on homepage, no contextual help at booking, no process explanation |
| **Total** | | **20/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM assessment:** Distinctively branded — not generically AI-made. The Botanical Sanctuary executes well. Two tells: section-tag eyebrow on every major section heading (5 times across the homepage), and the sectionAppear keyframe applied uniformly to 25 selectors in globals.css.

**Deterministic scan:** 3 layout-transition warnings.
- globals.css:565 — cursor width/height transition
- HomeServicesSection.tsx:300 — cursor width/height transition
- ServicesSection.tsx:300 — cursor width/height transition

## Overall Impression

Strong brand identity. Three implementation bugs undercut it: live-server dev script in production layout, all service cards showing the same wrong image, and a 155svh hero that buries the CTA off-screen.

## What's Working

1. Before/after gallery in OurResults — answers the patient's real question with evidence.
2. Custom "Book" cursor on service card images — on-brand, memorable, correctly implemented cursor state management.
3. Testimonials section dark-surface art direction — strong compositional break, right structural choice for trust-building.

## Priority Issues

**[P0] Live server script in production layout**
- What: layout.tsx:43 contains `<script src="http://localhost:8400/live.js"></script>`
- Why: Fires a failing network request on every production page load.
- Fix: Remove lines 42-44 from layout.tsx.

**[P1] No prefers-reduced-motion fallback for sectionAppear**
- What: globals.css:146-153 sets opacity:0 on 25 selectors as initial state, with no @media (prefers-reduced-motion) alternative.
- Why: Entire page is invisible for reduced-motion users; relevant for elderly and vestibular-disorder patients.
- Fix: Add @media (prefers-reduced-motion: reduce) block setting opacity:1, transform:none, animation:none on all animated selectors.

**[P1] Service cards render same placeholder image for every service**
- What: HomeServicesSection.tsx:257 hardcodes src="/images/assets/blog-3.webp". The SERVICES data has correct CDN image URLs in .img — never used.
- Why: Identical images make it impossible to recognize/differentiate services visually.
- Fix: Replace the hardcoded src with service.img.

**[P1] Hero height (155svh) buries CTA below the fold**
- What: HeroSlider.tsx:30 minHeight: "155svh", Swiper height: "140vh". Logo branding takes first 40vh. CTA button off-screen on mobile.
- Why: Primary conversion action invisible on first load, opposing the product goal.
- Fix: Reduce to 100svh maximum. Place CTA within first 65vh.

**[P2] Universal * transition causes performance jank**
- What: globals.css:125 applies 7-property transitions to every element.
- Fix: Remove the * rule; scope transitions to interactive elements only.

**[P2] Section eyebrow tags on every section**
- What: .section-tag appears in About, Results, Services, WhyChooseUs, Testimonials — every major section.
- Fix: Keep only where category genuinely aids navigation (Services, maybe Results). Remove from the rest.

## Persona Red Flags

**Jordan (First-Timer):** Two-phase service UX requires category commitment before seeing any services. No pre-booking process explanation.

**Casey (Mobile User):** CTA off-screen on mobile. Category picker at repeat(4, minmax(250px, 1fr)) overflows on 375px screens.

**Sam (Accessibility):** No prefers-reduced-motion fallback = invisible page. lang="en" hardcoded when Arabic is active.

## Minor Observations

- globals.css:576: .cursor-xray uses cold blue (rgba(63,124,206,0.25)) — completely off-palette.
- WhyChooseUs.tsx:316: Muted text via opacity:0.75 inconsistent with color token approach elsewhere.
- TestimonialsSection.tsx:36: slice(1,4) always skips the first reviewer — likely an index bug.
- layout.tsx:36: lang="en" should be dynamic for correct screen reader pronunciation in Arabic mode.
- HeroSlider.tsx: EffectFade imported but unused.
