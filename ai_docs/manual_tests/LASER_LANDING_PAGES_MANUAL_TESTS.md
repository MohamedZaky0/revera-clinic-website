# Google Ads Laser Landing Pages — Manual Test Checklist

Context: DEC-087 / RISK-103. Pages: `/laser-tagamoa`, `/laser-tagamoa/dark-skin`, `/laser-men-tagamoa`,
`/privacy`. Typecheck and eslint are clean and the pages were exercised in the dev browser (desktop + 375px
mobile, event capture, image loading), but a human must confirm the items below — especially on a real phone
and against the production deployment. Test on the deployed Vercel URL, not only localhost.

## Evidence log

| # | Check | Result | Evidence | Date | Tester |
|---|---|---|---|---|---|
| 1 | All four routes load; logo + images render | | | | |
| 2 | Ad URL stays clean (no `?lang=`), `<html lang="ar" dir="rtl">` | | | | |
| 3 | Mobile 375px: no horizontal scroll, sticky WhatsApp bar, header call button hidden | | | | |
| 4 | WhatsApp buttons open the right chat with the right prefilled text/tag | | | | |
| 5 | Call buttons dial the clinic | | | | |
| 6 | Men page copy is fully masculine; women pages fully feminine | | | | |
| 7 | FAQ answers match their questions (all variants) | | | | |
| 8 | Dark-skin page shows the dark-skin section under the hero | | | | |
| 9 | Main site unaffected (`/`, `/services`, `/book`) incl. language switch | | | | |
| 10 | GTM: events arrive in Tag Assistant / Preview once `NEXT_PUBLIC_GTM_ID` is set | | | | |
| 11 | RISK-103 claims confirmed or removed | | | | |
| 12 | Lighthouse mobile (LCP < 2.5s, no CLS) | | | | |

## Checks

- [ ] **1.** Open each of the four URLs. Logo (green mark + "Revera CLINIC" wordmark) shows in header and footer;
      hero shows the reception photo; the "المحادثة الصح" section shows a doctor portrait (not a treatment
      photo). No broken-image icons.
- [ ] **2.** Open `/laser-tagamoa?gclid=TEST&utm_campaign=x`. The address bar keeps exactly that query (no
      `lang=en` added). In DevTools: `document.documentElement.lang === "ar"`, `dir === "rtl"`,
      `sessionStorage.gclid === "TEST"`.
- [ ] **3.** On a real phone: nothing scrolls sideways; the green WhatsApp bar sticks to the bottom and does not
      cover the footer text; the header shows only the WhatsApp button (call button hidden); the hero call
      button is full width with icon and text on one line.
- [ ] **4.** Tap every WhatsApp button (header, hero, device, dark-skin, conversation, final, sticky). The chat
      opens on the clinic number with a prefilled Arabic message ending in a tag like `[LP-W-HERO]`,
      `[LP-M-FINAL]`. Men page tags start `LP-M-`; dark-skin page hero tag is `LP-W-DARK`.
- [ ] **5.** Tap the header/hero/final/phone-number call links: the dialer opens with `+201035595691`.
- [ ] **6.** Read `/laser-men-tagamoa` top to bottom: no feminine forms (اتصلي، اسألي، ابعتي، تحجزي، تفهمي).
      Read `/laser-tagamoa`: no masculine imperatives.
- [ ] **7.** Open every FAQ on all three pages. Each answer answers its question — specifically: device
      question, "hair light/white" question, and (men) "thick hair" question.
- [ ] **8.** `/laser-tagamoa/dark-skin`: the dark-skin (Fitzpatrick) section appears right after the trust bar;
      on `/laser-tagamoa` it appears after the device section; on the men page it is absent.
- [ ] **9.** Visit `/`, `/services`, `/book`. Headings still use the Marcellus serif, the floating WhatsApp
      button still appears on `/`, and switching language still updates `?lang=` and direction.
- [ ] **10.** Set `NEXT_PUBLIC_GTM_ID` on Vercel, redeploy, open Tag Assistant on a landing URL. Click each CTA
      and scroll: `landing_view`, `whatsapp_click` (with `placement`), `call_click`, `map_click`,
      `scroll_depth` (25/50/75/90) appear once per action.
- [ ] **11.** Walk the RISK-103 list with the clinic owner/doctor; record what was confirmed or edited out.
- [ ] **12.** Run Lighthouse (mobile) on `/laser-tagamoa`; record LCP/CLS/accessibility scores.
