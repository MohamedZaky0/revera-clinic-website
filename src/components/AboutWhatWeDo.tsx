"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

export function AboutWhatWeDo() {
  const { t, isRTL } = useLanguage();

  return (
    <section className="section-padding bg-white" style={{ overflow: "hidden" }}>
      <div className="cr-container">

        <style>{`
          .awwd-grid {
            display: grid;
            grid-template-columns: 1fr 1.15fr 1fr;
            gap: clamp(24px, 4vw, 56px);
            align-items: center;
          }

          /* ── Before/After card ── */
          .awwd-ba-card {
            background: var(--cr-secondary, #EDF1EC);
            border-radius: 24px;
            overflow: hidden;
            padding: 0;
            position: relative;
            box-shadow: 0 4px 20px rgba(90,61,52,0.08);
          }
          .awwd-ba-top-label {
            position: absolute;
            top: 14px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.25em;
            color: var(--cr-primary, #414E36);
            text-transform: uppercase;
            z-index: 2;
          }
          .awwd-ba-top-label span {
            display: inline-block;
            background: rgba(245,241,236,0.9);
            padding: 4px 14px;
            border-radius: 20px;
          }
          .awwd-ba-row {
            position: relative;
            width: 100%;
          }
          .awwd-ba-row img {
            width: 100%;
            aspect-ratio: 5/3;
            object-fit: cover;
            display: block;
          }
          .awwd-ba-side-label {
            position: absolute;
            top: 50%;
            transform: translateY(-50%) rotate(-90deg);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.3em;
            color: rgba(90,61,52,0.55);
            text-transform: uppercase;
            white-space: nowrap;
            pointer-events: none;
          }
          .awwd-ba-side-label.before-label { right: 10px; }
          .awwd-ba-side-label.after-label  { left: 10px; }
          .awwd-ba-divider {
            height: 2px;
            background: var(--color-brand-sand, #F2EFE9);
          }
          .awwd-ba-bottom-url {
            font-size: 9px;
            letter-spacing: 0.18em;
            color: rgba(90,61,52,0.35);
            text-align: center;
            padding: 8px 0;
            text-transform: uppercase;
          }

          /* ── Center content ── */
          .awwd-checklist {
            list-style: none;
            margin: 0 0 28px;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .awwd-checklist li {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            font-weight: 500;
            color: var(--cr-primary);
          }
          .awwd-check-box {
            width: 22px;
            height: 22px;
            border-radius: 6px;
            background: rgba(90, 106, 81, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .awwd-btn-row {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .awwd-learn-btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 13px 26px;
            border-radius: 30px;
            background: var(--cr-secondary, #EDF1EC);
            border: 1.5px solid rgba(90, 106, 81, 0.4);
            color: var(--cr-primary);
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.25s ease;
          }
          .awwd-learn-btn:hover {
            background: var(--cr-primary);
            color: #fff;
            border-color: var(--cr-primary);
          }
          .awwd-arrow-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--color-brand-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.25s ease;
          }
          .awwd-arrow-btn:hover {
            background: var(--cr-primary);
          }

          /* ── Right arch image ── */
          .awwd-arch-wrapper {
            position: relative;
            width: 100%;
          }
          .awwd-arch-img {
            position: relative;
            width: 100%;
            aspect-ratio: 3 / 4;
            border-radius: 999px;
            overflow: hidden;
            box-shadow: 0 10px 32px rgba(90,61,52,0.14);
          }
          .awwd-exp-badge {
            position: absolute;
            bottom: 36px;
            left: -10px;
            background: rgba(65, 78, 54, 0.85);
            backdrop-filter: blur(8px);
            border-radius: 50%;
            width: 100px;
            height: 100px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 10px;
            box-shadow: 0 4px 16px rgba(90,61,52,0.18);
          }
          .rtl-awwd .awwd-exp-badge {
            left: auto;
            right: -10px;
          }
          .rtl-awwd .awwd-ba-side-label.before-label { right: auto; left: 10px; }
          .rtl-awwd .awwd-ba-side-label.after-label  { left: auto; right: 10px; }

          @media (max-width: 1024px) {
            .awwd-grid { grid-template-columns: 1fr; gap: 40px; }
            .awwd-ba-card, .awwd-arch-wrapper { max-width: 420px; margin: 0 auto; width: 100%; }
            .awwd-center-col { text-align: center; }
            .awwd-checklist li { justify-content: center; }
            .rtl-awwd .awwd-checklist li { justify-content: center; flex-direction: row; }
            .awwd-btn-row { justify-content: center; }
          }
        `}</style>

        <div
          className={`awwd-grid ${isRTL ? "rtl-awwd" : ""}`}
          style={{ direction: isRTL ? "rtl" : "ltr" }}
        >
          {/* ── Column 1: Single image ── */}
          <div
            className="overflow-hidden rounded-2xl"
            style={{ aspectRatio: "3/4", boxShadow: "0 4px 20px rgba(90,61,52,0.08)" }}
          >
            <img
              src={t.aboutPage.whatWeDoImage1 || "/images/clinic/interior.jpg"}
              alt="Revera care"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          {/* ── Column 2: Text content ── */}
          <div
            className="awwd-center-col"
            style={{ textAlign: isRTL ? "right" : "left" }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "14px",
                direction: isRTL ? "rtl" : "ltr",
              }}
            >
              <img 
                src="/images/main_logo.png" 
                alt="" 
                style={{ width: 44, height: 44, objectFit: "contain", flexShrink: 0 }} 
              />
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  letterSpacing: isRTL ? "normal" : "0.2em",
                  color: "var(--color-brand-secondary)",
                  textTransform: "uppercase",
                  lineHeight: "normal",
                }}
              >
                {t.whatWeDo.tag}
              </span>
            </div>

            {/* Heading */}
            <h2
              style={{
                margin: "0 0 18px",
                fontSize: "clamp(28px, 4vw, 44px)",
                lineHeight: 1.15,
                fontWeight: 400,
                color: "var(--cr-primary)",
                fontFamily: "var(--font-marcellus), serif",
              }}
            >
              {t.aboutPage.whatWeDoHeading}
            </h2>

            {/* Description */}
            <p
              style={{
                margin: "0 0 24px",
                fontSize: "14px",
                lineHeight: 1.75,
                color: "var(--cr-muted-foreground, #5A6A51)",
              }}
            >
              {t.aboutPage.whatWeDoDescription}
            </p>

            {/* Checklist */}
            <ul className="awwd-checklist">
              {t.aboutPage.whatWeDoList.map((item) => (
                <li key={item}>
                  <span className="awwd-check-box">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--cr-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            {/* CTA buttons */}
            <div className="awwd-btn-row">
              <Link href="/services" className="awwd-learn-btn">
                {t.whatWeDo.learnMore}
              </Link>
              <Link href="/services" className="awwd-arrow-btn" aria-label="Learn more">
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 18 18" 
                  fill="none"
                  style={{ transform: isRTL ? "scaleX(-1)" : "none" }}
                >
                  <path d="M5 13L13 5M13 5H6M13 5V12" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>

          {/* ── Column 3: Arch image + years badge ── */}
          <div className="awwd-arch-wrapper">
            <div className="awwd-arch-img">
              <Image
                src={t.aboutPage.whatWeDoImage2 || "/images/clinic/video-thumbnail.jpg"}
                alt="Doctor performing treatment"
                fill
                sizes="(max-width: 1024px) 100vw, 380px"
                style={{ objectFit: "cover", objectPosition: "center top" }}
                unoptimized
              />
            </div>

            {/* Years of Experience badge */}
            <div className="awwd-exp-badge">
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#fff",
                  lineHeight: 1.3,
                  textAlign: "center",
                }}
              >
                {t.whatWeDo.yearsLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
