---
target: src/app/page.tsx
total_score: 20
p0_count: 0
p1_count: 2
timestamp: 2026-06-08T09-29-35Z
slug: src-app-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Services section shows load state; form submission has zero feedback |
| 2 | Match System / Real World | 3 | Copy now specific and brand-appropriate; minor section tag taxonomy leaks |
| 3 | User Control and Freedom | 2 | Booking modal cancels cleanly; form has no undo; no reduced-motion content fallback |
| 4 | Consistency and Standards | 3 | Visual system cohesive; identical eyebrow on every section breaks internal consistency |
| 5 | Error Prevention | 1 | No required field markers, no client-side validation |
| 6 | Recognition Rather Than Recall | 3 | Primary CTAs visible; icon-only circle arrow in HowItWorks has no label |
| 7 | Flexibility and Efficiency | 1 | No keyboard shortcuts; single rigid conversion funnel |
| 8 | Aesthetic and Minimalist Design | 3 | Clean; stats section and uniform reveal creates minor noise |
| 9 | Error Recovery | 1 | Form is a dead end — e.preventDefault() with no handler or feedback |
| 10 | Help and Documentation | 1 | No in-page help; FAQ not surfaced on homepage |
| **Total** | | **20/40** | **Acceptable** |

## Anti-Patterns Verdict

Not instantly AI-generated. Hero and testimonials section are strong. Two remaining tells: (1) identical translateY entrance applied to every section; (2) uppercase tracked eyebrow above every section heading.

Detector: 3 layout-transition warnings in globals.css:565, HomeServicesSection.tsx:300, ServicesSection.tsx:300. No false positives.

## Priority Issues

**[P1] Content gated at opacity-0** — IntersectionObserver failure leaves sections invisible. Fix by defaulting to visible and using animation-enhances-default pattern.

**[P1] Form is a dead end** — onSubmit is e.preventDefault() only. No handler, no feedback, no success state. Primary non-booking conversion path is broken.

**[P2] Stats section is metric-hero template** — 4-column animated counter grid contradicts PRODUCT.md anti-reference. Remove or de-prioritise; let before/after carousel carry results.

**[P2] Eyebrow on every section** — 5 consecutive sections use identical diamond-SVG + uppercase tag. Design system specifies 1-2 per page max.

**[P2] Layout-property transitions causing reflow jank** — width/height animated in 3 files. Replace with transform-based alternatives.

## Persona Red Flags

**Layla (Target Patient)**: No WhatsApp CTA anywhere. Primary contact method for target demographic is absent.

**Jordan (First-Timer)**: Placeholder-as-label fails WCAG 1.3.1/3.3.2. Form submits silently. "Our story" button fires booking modal — label/action mismatch.

**Riley (Stress Tester)**: Form fails silently on all inputs. Background-tab IntersectionObserver miss leaves sections invisible. Before/After alt text meaningless.

## Minor Observations

- AboutSection "Our story" button fires openBooking() — label/action mismatch
- Testimonials id="our-mission" is semantically stale after copy update
- HowItWorks sticky column inside overflow:hidden — sticky likely broken
- wcu-vertical-span 8px font on mobile is below legible threshold
- Icon-only circle link in HowItWorks CTA has no aria-label
