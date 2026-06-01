"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export function AboutWhatWeDo() {
  const { t, isRTL } = useLanguage();

  return (
    <section className="section-padding bg-white">
      <div className="cr-container">
        <div
          className="about-wwd-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "32px",
            alignItems: "center",
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          {/* Image 1 */}
          <div className="about-wwd-img1 overflow-hidden rounded-2xl" style={{ aspectRatio: "3/4" }}>
            <img
              src="/images/assets/h7.jpg"
              alt="Crystal Rose care"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          {/* Content */}
          <div style={{ textAlign: isRTL ? "right" : "left" }}>
            <span className="section-tag">{t.whatWeDo.tag}</span>
            <h2 className="mt-3 mb-4" style={{ lineHeight: 1.2 }}>
              {t.aboutPage.whatWeDoHeading}
            </h2>
            <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--cr-muted-foreground, #8a6d62)" }}>
              {t.aboutPage.whatWeDoDescription}
            </p>

            <ul style={{ listStyle: "none", margin: "0 0 28px", padding: 0, display: "flex", flexDirection: "column", gap: "14px" }}>
              {t.aboutPage.whatWeDoList.map((item, i) => (
                <li
                  key={item}
                  style={{ display: "flex", alignItems: "center", gap: "12px", flexDirection: isRTL ? "row-reverse" : "row" }}
                >
                  <img
                    src={i === 0 ? "/images/icon-journey-1.svg" : "/images/icon-journey-2.svg"}
                    alt=""
                    aria-hidden="true"
                    style={{ width: 28, height: 28, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--cr-primary)" }}>{item}</span>
                </li>
              ))}
            </ul>

            <Link href="/contact" className="btn-primary">
              {t.whatWeDo.learnMore}
            </Link>
          </div>

          {/* Image 2 with badge */}
          <div className="about-wwd-img2" style={{ position: "relative" }}>
            <div className="overflow-hidden rounded-2xl" style={{ aspectRatio: "3/4" }}>
              <img
                src="/images/assets/h6.jpg"
                alt="Years of experience"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 24,
                left: isRTL ? "auto" : -16,
                right: isRTL ? -16 : "auto",
                background: "var(--cr-primary)",
                borderRadius: 14,
                padding: "18px 22px",
                display: "flex",
                flexDirection: "column",
                alignItems: isRTL ? "flex-end" : "flex-start",
                boxShadow: "0 8px 30px rgba(90,61,52,0.3)",
              }}
            >
              <span style={{ fontFamily: "var(--font-marcellus), serif", fontSize: 44, color: "#fff", lineHeight: 1 }}>
                15+
              </span>
              <span style={{ fontSize: 11, color: "var(--cr-accent)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                {t.whatWeDo.yearsLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .about-wwd-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .about-wwd-img1, .about-wwd-img2 { max-width: 420px; margin: 0 auto; width: 100%; }
        }
      `}</style>
    </section>
  );
}
