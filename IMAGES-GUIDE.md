# Revera Website — Images Guide

All photos are stored under `public/images/`. To replace any photo, simply drop a new file at the same path with the **exact same filename and extension**.

---

## 🎠 Hero Slider — `public/images/hero/`

| File | Used In | Description |
|------|---------|-------------|
| `slide-1.jpg` | Hero Section (slide 1) | Background/landscape slide |
| `slide-2.jpg` | Hero Section (slide 2) | Doctor photo slide |
| `slide-3.jpg` | Hero Section (slide 3) | Third slide image |

---

## 👩‍⚕️ Doctor Portraits — `public/images/doctor/`

| File | Used In | Description |
|------|---------|-------------|
| `portrait-main.jpg` | Testimonials section, FAQ section, About section (right portrait) | Main doctor portrait (used in multiple places) |
| `portrait-about.png` | About section (left portrait), About Page intro, Our Approach section | Doctor in white coat |
| `portrait-faq.jpg` | FAQ section (second overlapping photo) | Doctor portrait for FAQ |

---

## 🏥 Clinic Photos — `public/images/clinic/`

| File | Used In | Description |
|------|---------|-------------|
| `room.jpg` | Why Choose Us, What We Do, Our Approach, About Page Intro | Clinic room / examination room |
| `treatment.jpg` | Why Choose Us, What We Do | Doctor performing skin treatment |
| `interior.jpg` | About Section, About What We Do (column 1) | Clinic interior / waiting area |
| `video-thumbnail.jpg` | Intro Video thumbnail, About What We Do (arch image) | Video cover photo |
| `support-agent.png` | Appointment / Contact section | Support agent photo |

---

## ✍️ Blog Posts — `public/images/blog/`

| File | Used In | Description |
|------|---------|-------------|
| `post-1.webp` | Blog page — Vitamin C article | Blog article cover photo |
| `post-2.jpg` | Blog page — Retinol article | Blog article cover photo |
| `post-3.webp` | Blog page — Hyaluronic Acid article, Services card thumbnail | Blog article cover photo (also used as services card image) |

---

## 🔄 Before & After Photos — `public/images/before-after/`

Replace any pair by uploading a new file with the same name. Keep the same extension (`.jpeg` for pairs 1–3, `.jpg` for pairs 4–6).

| Before File | After File | Pair # |
|-------------|------------|--------|
| `1-before.jpeg` | `1-after.jpeg` | Pair 1 |
| `2-before.jpeg` | `2-after.jpeg` | Pair 2 |
| `3-before.jpeg` | `3-after.jpeg` | Pair 3 |
| `4-before.jpg` | `4-after.jpg` | Pair 4 |
| `5-before.jpg` | `5-after.jpg` | Pair 5 |
| `6-before.jpg` | `6-after.jpg` | Pair 6 |

> **To add a new before/after pair:** Add `7-before.jpg` and `7-after.jpg`, then add `{ id: 7, before: "/images/before-after/7-before.jpg", after: "/images/before-after/7-after.jpg" }` to `BEFORE_AFTER_PAIRS` in `src/components/OurResults.tsx`.

---

## 🎨 Brand & Logo — `public/images/`

| File | Description |
|------|-------------|
| `main_logo.png` | Main brand logo — used in navbar, preloader, section icons, badges |
| `footer_main_logo.png` | Logo used in footer |

---

## 🖼️ Decorative SVGs (do not need to change)

These are design elements used for section backgrounds and decorations:

| File | Used In |
|------|---------|
| `why-choose-bg-shape.svg` | Why Choose Us, Our Approach, About Page, Appointment section |
| `faq-dot-img.svg` | FAQ section, Testimonials, Page Header |
| `footer-bg-shape.svg` | Footer, Page Header, Our Journey |
| `approach-bg-shape.svg` | Services, What We Do |
| `testimonials-bg-shape.png` | Testimonials section background |
| `page-header-bg.svg` | Inner page headers |
| `journey-bg-shape.svg` | Our Journey section |
| `service-bg-shape.svg` | Services section |
| `appointment-bg-shape.svg` | Appointment section |

---

---

## 📐 Best Photo Ratios Per Section

Use these dimensions when preparing photos in Photoshop, Canva, or any editor before uploading.

---

### 🎠 Hero Slider — `hero/slide-1.jpg`, `slide-2.jpg`, `slide-3.jpg`
| Ratio | Recommended Size | Notes |
|-------|-----------------|-------|
| **16:9** | **1920 × 1080 px** | Full-width background. Focus point should be center-top. Avoid text-heavy areas at the bottom (gradient overlay covers it). |

---

### 👩‍⚕️ Doctor Portraits

| File | Ratio | Recommended Size | Notes |
|------|-------|-----------------|-------|
| `doctor/portrait-about.png` | **3:4** | **900 × 1200 px** | Used in About section (both left & right portrait slots) and About Page intro. Subject should be centered, head at top 20%. |
| `doctor/portrait-main.jpg` | **5:4** | **1000 × 800 px** | Testimonials section — slightly wider frame. Subject centered. |
| `doctor/portrait-faq.jpg` | **3:4** | **900 × 1200 px** | FAQ section second overlapping photo. Head at top 20%. |

---

### 🏥 Clinic Photos

| File | Ratio | Recommended Size | Notes |
|------|-------|-----------------|-------|
| `clinic/room.jpg` | **3:4** | **750 × 1000 px** | Why Choose Us left image (250×330 px display). Upright/portrait orientation. |
| `clinic/treatment.jpg` | **3:4** | **750 × 1000 px** | Why Choose Us right image & What We Do section. |
| `clinic/interior.jpg` | **16:10** | **1200 × 750 px** | About section bottom image & About What We Do column 1. Landscape. |
| `clinic/video-thumbnail.jpg` | **21:9** | **1920 × 823 px** | Intro Video thumbnail (ultra-wide cinematic). Also used in About What We Do arch (3:4 crops center). Keep main subject centered. |
| `clinic/support-agent.png` | **3:4** | **960 × 1320 px** | Appointment section. Subject should be upper-body/full-body, centered, clear background preferred. |

---

### ✍️ Blog Posts

| File | Ratio | Recommended Size | Notes |
|------|-------|-----------------|-------|
| `blog/post-1.webp` | **1:1** | **800 × 800 px** | Blog grid card — square crop. Keep subject centered. |
| `blog/post-2.jpg` | **1:1** | **800 × 800 px** | Blog grid card — square crop. |
| `blog/post-3.webp` | **1:1** | **800 × 800 px** | Blog grid card & Services card thumbnail. |

---

### 🔄 Before & After Photos

| Files | Ratio | Recommended Size | Notes |
|-------|-------|-----------------|-------|
| `before-after/1-before.jpeg` … `6-after.jpg` | **3:4** | **600 × 800 px** | Both before and after of the same pair **must be identical dimensions**. Keep subject framing consistent between the two. |

---

### 📊 Quick Ratio Cheat Sheet

| Section | Ratio | Orientation |
|---------|-------|-------------|
| Hero Slider | **16:9** | Landscape |
| Doctor Portraits | **3:4** | Portrait |
| Testimonials Doctor | **5:4** | Slight landscape |
| Clinic Room / Treatment | **3:4** | Portrait |
| Clinic Interior | **16:10** | Landscape |
| Video Thumbnail | **21:9** | Ultra-wide |
| Support Agent | **3:4** | Portrait |
| Blog Posts | **1:1** | Square |
| Before & After | **3:4** | Portrait |

---

## 📌 Quick Reference — Folder Map

```
public/images/
├── hero/                   ← Hero slider images (slide-1, slide-2, slide-3)
├── doctor/                 ← Doctor portraits (portrait-main, portrait-about, portrait-faq)
├── clinic/                 ← Clinic photos (room, treatment, interior, video-thumbnail, support-agent)
├── blog/                   ← Blog post covers (post-1, post-2, post-3)
├── before-after/           ← Before & after pairs (1-before/after ... 6-before/after)
├── main_logo.png           ← Brand logo
└── [decorative svgs]       ← Design shapes (no need to change)
```
