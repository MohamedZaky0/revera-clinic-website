"use client";

import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

export function WhatWeDo() {
  const { t, isRTL } = useLanguage();

  return (
    <section
      id="what-we-do"
      className="bg-white section-padding"
      style={{ overflow: "hidden" }}
    >
      <div className="cr-container" style={{ maxWidth: "1480px" }}>
        <div
          style={{
            position: "relative",
            backgroundColor: "var(--cr-secondary)",
            borderRadius: "32px",
            border: "1px solid rgba(90, 106, 81, 0.3)",
            overflow: "hidden",
            padding: "clamp(40px, 5vw, 80px) clamp(24px, 4vw, 64px)",
          }}
        >
          {/* ── Decorative shapes ── */}
          {/* Top-Left: Leaves */}
          <div
            className="absolute top-0 pointer-events-none select-none opacity-[0.08] w-[260px] h-[260px]"
            style={{
              left: isRTL ? "auto" : 0,
              right: isRTL ? 0 : "auto",
              transform: isRTL ? "scaleX(-1)" : "none",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/why-choose-bg-shape.svg" alt="" className="w-full h-full object-contain" />
          </div>

          {/* Top-Right: Dots */}
          <div
            className="absolute top-10 pointer-events-none select-none opacity-[0.12] w-[180px] h-[180px]"
            style={{
              left: isRTL ? "40px" : "auto",
              right: isRTL ? "auto" : "40px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/faq-dot-img.svg" alt="" className="w-full h-full object-contain" />
          </div>

          {/* Bottom-Right: Organic shape */}
          <div
            className="absolute bottom-0 pointer-events-none select-none opacity-[0.06] w-[280px] h-[200px]"
            style={{
              left: isRTL ? 0 : "auto",
              right: isRTL ? "auto" : 0,
              transform: isRTL ? "scaleX(-1)" : "none",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/approach-bg-shape.svg" alt="" className="w-full h-full object-contain" />
          </div>

          {/* ── Content grid ── */}
          <div
            className="what-we-do-grid"
            style={{
              position: "relative",
              zIndex: 10,
              display: "grid",
              gridTemplateColumns: "1fr 1.1fr 0.9fr",
              gap: "40px",
              alignItems: "center",
              direction: isRTL ? "rtl" : "ltr",
            }}
          >
            {/* ── Left column — dental clinic image (rectangular, rounded) ── */}
            <div style={{ position: "relative" }}>
              <div
                className="image-anime"
                style={{
                  position: "relative",
                  aspectRatio: "3 / 4",
                  borderRadius: "20px",
                  overflow: "hidden",
                }}
              >
                <Image
                  src="/images/clinic/room.jpg"
                  alt="Dental clinic — Revera Clinics"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  style={{ objectFit: "cover", objectPosition: "center" }}
                  priority={false}
                />
              </div>
            </div>

            {/* ── Center column — text content ── */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                textAlign: isRTL ? "right" : "left",
              }}
            >
              <span className="section-tag">{t.whatWeDo.tag}</span>

              <h2 style={{ margin: 0, lineHeight: 1.15 }}>
                {t.whatWeDo.heading}
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "var(--cr-primary)",
                  opacity: 0.7,
                  fontSize: "15px",
                  lineHeight: 1.75,
                }}
              >
                {t.whatWeDo.description}
              </p>

              {/* Services checklist */}
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {t.whatWeDo.services.map((service, index) => (
                  <li
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexDirection: isRTL ? "row-reverse" : "row",
                      gap: "12px",
                    }}
                  >
                    {/* Checkbox icon */}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 22,
                        height: 22,
                        borderRadius: 5,
                        backgroundColor: "var(--cr-primary)",
                        flexShrink: 0,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2.5 6L5 8.5L9.5 3.5"
                          stroke="white"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span
                      style={{
                        fontSize: "15px",
                        fontWeight: 500,
                        color: "var(--cr-primary)",
                      }}
                    >
                      {service}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Learn More + Arrow button row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "8px",
                  flexDirection: isRTL ? "row-reverse" : "row",
                }}
              >
                <a
                  href="#services"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "12px 28px",
                    borderRadius: "30px",
                    backgroundColor: "var(--cr-primary)",
                    color: "var(--cr-white, #fff)",
                    fontSize: "14px",
                    fontWeight: 600,
                    textDecoration: "none",
                    letterSpacing: "0.03em",
                    transition: "all 0.3s ease",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#2e3a26";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--cr-primary)";
                  }}
                >
                  {t.whatWeDo.learnMore}
                </a>
                <a
                  href="#services"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    backgroundColor: "var(--color-brand-secondary)",
                    color: "#ffffff",
                    textDecoration: "none",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--cr-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-brand-secondary)";
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M5 13L13 5M13 5H6M13 5V12"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </div>
            </div>

            {/* ── Right column — oval treatment image + badge ── */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0px",
                position: "relative",
              }}
            >
              {/* Oval/pill-shaped treatment image */}
              <div
                className="image-anime"
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "3 / 4",
                  borderRadius: "120px 120px 120px 120px",
                  overflow: "hidden",
                }}
              >
                <Image
                  src="/images/clinic/treatment.jpg"
                  alt="Treatment — Revera Clinics"
                  fill
                  sizes="(max-width: 768px) 100vw, 30vw"
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                  priority={false}
                />
              </div>

              {/* Years of Experience floating badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: "30px",
                  ...(isRTL ? { right: "-20px" } : { left: "-20px" }),
                  width: "110px",
                  height: "110px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-brand-primary)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "2px",
                  boxShadow: "0 8px 24px rgba(90, 61, 52, 0.2)",
                  border: "4px solid var(--cr-bg, #EDF1EC)",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--cr-white, #fff)",
                    textAlign: "center",
                    lineHeight: 1.3,
                    letterSpacing: "0.02em",
                  }}
                >
                  {t.whatWeDo.yearsLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive grid override */}
      <style>{`
        @media (max-width: 1024px) {
          .what-we-do-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 32px !important;
          }
          .what-we-do-grid > div:first-child {
            grid-row: 1;
          }
          .what-we-do-grid > div:last-child {
            grid-column: 1 / -1;
            max-width: 320px;
            margin: 0 auto;
          }
        }
        @media (max-width: 768px) {
          .what-we-do-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .what-we-do-grid > div:last-child {
            max-width: 280px;
          }
        }
      `}</style>
    </section>
  );
}
