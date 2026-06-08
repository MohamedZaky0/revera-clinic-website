# Product

## Register

brand

## Users

Primary: Egyptian patients (and medical tourists) researching dermatology, cosmetic surgery, laser treatments, and dental care. They arrive with a specific need in mind — a skin concern, a desired procedure, or a referral from someone who trusts the clinic. They're comparing providers and making a high-stakes, personal decision. Mobile is likely, attention is limited, and trust must be earned fast.

Secondary: International patients exploring medical tourism options in Egypt. They need clear service information, demonstrated expertise, and a booking path that feels reliable from abroad.

Job to be done: Assess whether Revera is the right clinic, feel confident in the quality and credentials, and book an appointment or initiate contact with minimal friction.

## Product Purpose

Revera Clinics is the digital presence of a dermatology and cosmetic surgery center (operated by ABU OBEID Group, supervised by Dr. Mahmoud Nasr Abu Obeid — 15+ years experience). The site must convert visitors into booked patients by communicating clinical authority through the aesthetic language of luxury rather than the cold language of medicine.

Success: A patient who lands on the site and — within one session — either books an appointment or contacts the clinic.

The site also includes a patient-facing layer: auth (login/account) and a booking modal. This is the portal entry point, not a full app, but design decisions should accommodate expanding this surface later.

## Brand Personality

Luxurious, transformative, warm.

The clinic is a destination, not a waiting room. Patients should feel they are entering somewhere that takes their appearance and wellbeing seriously — with the calm confidence of a surgeon and the welcoming warmth of a spa. The brand's deep olive and gold palette signals natural, earned refinement: not synthetic beauty, not clinical distance.

## Anti-references

- Generic pharma / hospital blue: cold blue-and-white stock-photo healthcare. Impersonal, mass-market, interchangeable.
- Overcrowded low-budget clinic site: busy layouts, mismatched fonts, promotional banner overload, no visual hierarchy.
- Sterile SaaS / tech startup: metric-hero templates, rounded-card grids, gradient CTAs, blue accent. Looks like a subscription tool, not a medical destination.

## Design Principles

1. **Authority through restraint.** Trust is earned by what is not present: no visual noise, no shouting headlines, no cluttered layouts. Empty space is confidence.
2. **Warm precision.** Clinical expertise and personal warmth are not opposites here — the olive-gold palette, serif display type, and measured animation must hold both simultaneously.
3. **The patient's journey first.** Every page decision should ask: does this reduce friction on the path to booking? Information architecture, CTAs, and mobile layout serve the patient, not the clinic's internal taxonomy.
4. **Bilingual by design, not by translation.** Arabic/RTL is not a toggle afterthought — it must be a first-class layout mode. Typography, spacing, and component direction should be designed for both reading directions.
5. **Show expertise, don't describe it.** Credentials, results, and testimonials speak louder than adjectives like "advanced" or "world-class". Concrete evidence over marketing language.

## Accessibility & Inclusion

WCAG 2.1 AA minimum. Key considerations: body text contrast must meet 4.5:1 against all background tones (the olive/ivory combination needs verification); bilingual content must maintain RTL text rendering without layout breaks; animation must respect `prefers-reduced-motion`; booking forms must be keyboard-navigable and screen-reader accessible.
