---
name: Revera Clinics
description: Dermatology, cosmetic surgery, and wellness clinic for patients seeking expert care in a setting that feels as good as its results.
colors:
  primary: "#414E36"
  primary-dark: "#1F251A"
  primary-deep: "#2E3A26"
  secondary: "#5A6A51"
  accent: "#C4AE7C"
  sand: "#F2EFE9"
  light: "#FBFBF9"
  tint: "#EDF1EC"
  error: "#E65757"
typography:
  display:
    fontFamily: "Marcellus, Georgia, serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "normal"
  headline:
    fontFamily: "Marcellus, Georgia, serif"
    fontSize: "clamp(1.75rem, 4vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "normal"
  title:
    fontFamily: "Marcellus, Georgia, serif"
    fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
  label:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.15em"
rounded:
  ui: "8px"
  input: "10px"
  image: "12px"
  modal: "20px"
  card: "24px"
  wrapper: "32px"
  pill: "50px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "24px"
  lg: "40px"
  xl: "80px"
  section: "100px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.light}"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.light}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.pill}"
    padding: "13px 28px"
  filter-pill:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  filter-pill-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.light}"
  card:
    backgroundColor: "{colors.light}"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.card}"
    padding: "24px"
  input:
    backgroundColor: "{colors.light}"
    textColor: "{colors.primary}"
    rounded: "{rounded.input}"
    padding: "14px 18px"
  section-wrapper:
    backgroundColor: "{colors.tint}"
    rounded: "{rounded.wrapper}"
    padding: "80px 48px"
---

# Design System: Revera Clinics

## 1. Overview

**Creative North Star: "The Botanical Sanctuary"**

A clinic that grows from its landscape. The space is olive-green rooms, warm-toned instruments, natural materials held in careful order. Patients enter somewhere that takes both their appearance and their time seriously — the calm precision of a surgeon, the welcoming stillness of a cultivated garden. Science and nature are not in tension here; they are one system.

The palette descends from this: deep olive green carries authority without coldness, warm royal gold marks precision without display, warm ivory and sage tint form the canvas the way stone and linen form a room. Nothing announces itself. The luxury is the absence of noise.

This system rejects three anti-patterns by name. The first is the generic pharma palette: cold blue-and-white clinical hygiene photography that could belong to any hospital anywhere. The second is the overcrowded low-budget clinic template: competing fonts, banner overload, no visual hierarchy. The third is the sterile SaaS shell: metric-hero layouts, rounded-card grids, gradient CTAs designed for a subscription product, not a body and a physician.

**Key Characteristics:**
- Deep olive green and warm gold are the dominant color voices; the ivory canvas recedes entirely
- Marcellus serif headings carry old-world authority; Sora body text is precise and legible
- Animation is intentional: 3D perspective entrance, custom preloader arcs, subtle hover lifts — not a reflex applied to every element equally
- Full bilingual (EN/AR) — RTL is a first-class layout mode, not a toggle
- Warm olive-brown ambient shadows throughout; cold gray is prohibited

## 2. Colors: The Olive Grove Palette

Nine tokens, two registers (light on ivory canvas; reversed on dark-section olive backgrounds). Gold is used sparingly — its rarity is the point.

### Primary
- **Deep Olive Green** (`#414E36`): The dominant surface color. Headings, navigation links, primary buttons, active state borders, brand identity marks. The backbone of every page.
- **Deepest Olive-Black** (`#1F251A`): Body text and the darkest UI text. Provides 4.5:1+ contrast against the ivory background.
- **Deeper Sage Hover** (`#2E3A26`): Hover state for primary buttons only. Slightly darker, same family.

### Secondary
- **Muted Sage Olive** (`#5A6A51`): Supporting text, metadata, muted captions, sublabels in bilingual pairs. One step lighter than primary.

### Tertiary (accent)
- **Warm Royal Gold** (`#C4AE7C`): Input borders at rest, focus rings, swiper bullets, badge backgrounds, decorative punctuation, the preloader arc. Used in ≤15% of any given surface.

### Neutral
- **Sophisticated Sand** (`#F2EFE9`): Dividers, subtle section borders, outline button borders. The visual separator between content zones.
- **Luxurious Warm Ivory** (`#FBFBF9`): Page background, card backgrounds, modal backgrounds. The canvas for everything else.
- **Sage Tint Canvas** (`#EDF1EC`): Section-level tinted backgrounds (services wrapper, alternating sections). One step greener than ivory; creates section rhythm without a hard break.
- **Error** (`#E65757`): Form validation errors only. Never used decoratively.

### Named Rules
**The Gold Restraint Rule.** Gold (`#C4AE7C`) appears on input borders, focus states, and decorative accents — never on primary text or buttons. The moment it appears in more than 15% of a screen, reduce it. Its warmth reads only because it is rare.

**The Warm Shadow Rule.** Shadows use `rgba(90, 61, 52, …)` — an olive-brown tint — never neutral gray or pure black. Cold shadows break the sanctuary atmosphere. If a shadow looks gray, it's wrong.

## 3. Typography

**Display Font:** Marcellus (Georgia, serif fallback)
**Body Font:** Sora (ui-sans-serif, system-ui fallback)

**Character:** Marcellus is engraved, unhurried, and carries the weight of a professional credential without the rigidity of a slab. Sora is geometric but humanist — technical clarity without coldness. The pairing reads as: the authority of a specialist, the approachability of someone who explains things well. One serif family for all headings; one sans family for all body. No third family.

### Hierarchy
- **Display** (Marcellus, 400, `clamp(2.25rem, 5vw, 3.75rem)`, lh 1.2): Hero headings, page-level statements. Never more than one per page section.
- **Headline** (Marcellus, 400, `clamp(1.75rem, 4vw, 3rem)`, lh 1.2): Section headings (`h2`). The primary reading anchor per section.
- **Title** (Marcellus, 400, `clamp(1.25rem, 2.5vw, 1.75rem)`, lh 1.3): Sub-headings, card titles, modal titles (`h3`). Inherits Marcellus's roman weight.
- **Body** (Sora, 400, `1rem` / 16px, lh 1.7): All prose. Line length capped at 65–75ch. The generous line-height (1.7) is non-negotiable — medical content requires sustained reading comfort.
- **Label** (Sora, 600, `0.6875rem` / 11px, ls 0.15em, uppercase): Section tags and category badges only. Used sparingly — not above every section heading by default, only where the label carries distinct categorical meaning.

### Named Rules
**The Marcellus Weight Rule.** Marcellus ships in one weight (regular 400). Do not attempt to bold headings by adding `font-weight: 700`; the font has no bold variant and the browser will synthesize a distorted stroke. Size and scale carry heading hierarchy; weight does not.

**The RTL Symmetry Rule.** All font sizes, line heights, and spacing scale identically in Arabic mode. The `body.rtl` class flips text direction; it changes nothing else. Do not introduce Arabic-only size overrides unless a specific glyph set demands it.

## 4. Elevation

This system uses structural ambient shadows throughout: surfaces have a permanent low presence that tells the eye where they sit in the stack. The shadow color is warm olive-brown (`rgba(90, 61, 52, …)`), never cold gray or pure black. A gray shadow breaks the sanctuary atmosphere.

Depth is also reinforced by the three-tier background system: ivory canvas (page) → sage tint (sections) → ivory card (content surface). These tonal steps read as z-layers before any shadow is applied.

### Shadow Vocabulary
- **Resting surface** (`0 2px 20px rgba(90, 61, 52, 0.08)`): Cards, service cards, the navbar on scroll, dropdowns. The ambient presence of an element at rest.
- **Hover lift** (`0 16px 32px rgba(0, 0, 0, 0.08)`): Cards and interactive surfaces on hover. Combined with `translateY(-2px) scale(1.01)` on the element — shadow and motion are one gesture.
- **Dropdown / modal** (`0 4px 12px rgba(90, 61, 52, 0.10)`): Language selector dropdown, modal box. Slightly more presence to confirm the layer separation.
- **Preloader radial** (`radial-gradient(ellipse at 60% 40%, #2E3A26 0%, #1F251A 65%)`): Not a box-shadow — a full-screen deep-olive radial gradient. The one moment of full-surface saturation.

### Named Rules
**The Warm Shadow Rule.** See Colors. Enforced doubly here: every `box-shadow` in the codebase uses the olive-brown rgba triplet, not `0,0,0`. Cold shadows are a code smell and signal an unsanctioned component.

## 5. Components

### Buttons
Quiet confidence: the pill shape (50px radius) is pronounced but not bulky. The olive fill speaks authority. Nothing shouts.

- **Shape:** Full pill (50px border-radius). The circle-ness is the identity, not decoration.
- **Primary:** Deep olive background (`#414E36`) + ivory text (`#FBFBF9`). Padding: 14px top/bottom, 28px sides. Font: Sora 14px, 500 weight.
- **Hover:** Background shifts to `#2E3A26` (deeper sage), element lifts `translateY(-1px)`. Transition 0.3s ease.
- **Outline:** Transparent background, sophisticated sand border (`#F2EFE9`, 1.5px). Same pill shape, same padding minus 1px (13px top/bottom to account for border). Used for secondary CTAs — "Learn More", "View All".
- **Readmore link variant:** No background, no border. Uppercase Sora 13px, weight 600, tracking 0.05em. A small arrow icon follows. On hover, the gap between text and arrow widens (`gap` animates from 8px to 14px) — the directional cue is the interaction.

### Filter Pills
Category selectors (services, blog) use the same pill shape as buttons but with the gold border at rest, becoming primary-fill on active.

- **Rest:** Transparent bg, gold border (`#C4AE7C`, 1.5px), olive text, 10px/20px padding, 50px radius.
- **Active / hover:** Olive fill (`#414E36`), ivory text, olive border.

### Cards / Containers
- **Corner Style:** 24px radius for standard cards. Service section wrapper uses 32px — the visual container that holds multiple cards.
- **Background:** Warm ivory (`#FBFBF9`).
- **Shadow:** Resting surface shadow (`0 2px 20px rgba(90,61,52,0.08)`) always applied; hover lift on interactive cards.
- **Border:** 1px solid `rgba(90, 106, 81, 0.2)` — the sage-tinted subtle border. Never heavier than 1px.
- **Internal Padding:** 24px default; 48px/32px for section-level wrappers.
- **Signature detail:** The arrow button on service cards is a 44px circle (`rgba(90,106,81,0.12)` bg) that rotates 45° on hover. This is the system's characteristic interaction gesture.

### Inputs / Fields
- **Style:** 1.5px gold border (`#C4AE7C`) at rest on ivory background. 10px border-radius (slightly less rounded than cards — inputs are precise instruments, not surfaces).
- **Focus:** Border shifts to primary olive (`#414E36`). No glow or shadow added — the color change is the cue.
- **Placeholder:** Gold color (`#C4AE7C`). The gold reappears here as a quiet invitation, not decoration.
- **Error:** Border and message color `#E65757`. Never used for decorative states.

### Navigation
- **Transparent at top of page**, transitions to `rgba(255,255,255,0.98)` with `0 2px 20px rgba(90,61,52,0.08)` shadow on scroll. The transition happens at `window.scrollY > 20`.
- **Height:** 112px desktop. Logo at 72px height.
- **Links:** Sora 16px, 500 weight at rest, 700 on active. Olive (`#414E36`) color throughout. 85% opacity at rest, 100% on hover — the dimming is the interaction, not a color change.
- **Login button:** Outline style (1.5px primary border, 6px radius — not pill, more compact). On hover, fills to olive.
- **Mobile:** Hamburger animates to ✕ via translate+rotate. Dropdown is ivory background at `rgba(255,255,255,0.98)` with sage-sand dividers.

### Service Card (signature component)
The image area hosts a custom cursor: on hover, the global cursor hides and a circular "Book" badge appears under the mouse inside the image. This is the system's highest-craft interaction moment — magnetic, surprising, immediately on-brand.

The image also pans and rotates slightly on hover: `scale(1.06) rotate(-1deg)` at 700ms cubic-bezier — slower than standard hover transitions to feel like a physical reveal, not a UI effect.

### Section-Level Wrapper
Services and select content blocks are wrapped in a 32px-radius sage-tint container (`#EDF1EC`), bordered `rgba(90,106,81,0.25)`. This creates a section-within-a-section hierarchy: the page canvas → the tinted room → the card contents. Three tonal tiers without a hard line.

### Preloader
Full-screen deep-olive radial gradient. The clinic logo (white) sits at center with two gold (`#C4AE7C`) concentric arc rings spinning in opposite directions. The preloader dissolves on opacity/visibility transition.

## 6. Do's and Don'ts

### Do:
- **Do** use `rgba(90, 61, 52, …)` — the warm olive-brown — as the shadow tint on every `box-shadow`. Never use `rgba(0,0,0,…)` except for the hover lift (where a slightly cooler shadow is acceptable at 0.08 opacity).
- **Do** let body text sit at `#1F251A` on `#FBFBF9` backgrounds. Verify contrast before introducing any secondary text color — `#5A6A51` on `#FBFBF9` clears 4.5:1 but only barely; use it for metadata and captions, not body paragraphs.
- **Do** use Marcellus at regular weight (400) for all headings. The scale carries the hierarchy; never synthesize bold.
- **Do** apply `text-wrap: balance` on h1–h3 elements, particularly in bilingual mode where Arabic strings run longer or shorter than English equivalents.
- **Do** animate the arrow icon (44px circle, `rotate(45deg)` on hover) on every interactive card. It is the system's characteristic gesture and must appear consistently.
- **Do** add `@media (prefers-reduced-motion: reduce)` fallbacks for the `sectionAppear` keyframe and all transform-based animations. Reduced motion should serve a crossfade or instant state change — content must never gate on a class-triggered animation that fails to fire.
- **Do** use gold (`#C4AE7C`) for input borders at rest and focus rings on non-input elements. Its warmth rewards patience.

### Don't:
- **Don't** use generic pharma blue-and-white. No `#2196F3`, no cold clinical palette, no stock-photo white hallways. This is an olive-green space.
- **Don't** let the layout become overcrowded. No competing font families, no banner stacking, no promotional hierarchies that fight each other for attention. Every element earns its place or it is removed.
- **Don't** use the SaaS metric-hero template: big stat + small label + gradient accent = the wrong brand entirely. Credentials, testimonials, and results communicate authority here, not dashboard numbers.
- **Don't** use gradient text (`background-clip: text`). Gold is too specific a brand signal to dissolve into a gradient.
- **Don't** use `border-left` greater than 1px as an accent stripe on cards or callouts. Any visual accent should be a full border, a background tint, or nothing.
- **Don't** add uppercase tracked section eyebrows above every heading. The `section-tag` class (small all-caps Sora label) is used selectively — once or twice per page where the category label genuinely aids navigation. One above every section is AI grammar, not Revera's voice.
- **Don't** use cold gray box-shadows. If a shadow color looks neutral or blue-shifted, replace it with the warm olive-brown tint.
- **Don't** introduce a fourth typeface. Marcellus + Sora is the system. New surfaces that feel they "need" something different should solve the problem with scale, weight, spacing, and color — not another font.
- **Don't** build RTL as an afterthought. Arabic mode must mirror layout direction, not just swap text. Flex/grid direction, icon placement, and padding asymmetry all need RTL verification before shipping.
