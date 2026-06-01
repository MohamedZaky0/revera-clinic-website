"use client";

import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

export function WhatWeDo() {
  const { t, isRTL } = useLanguage();

  return (
    <section
      id="what-we-do"
      className="bg-section section-padding"
    >
      <div className="cr-container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "64px",
            alignItems: "center",
            direction: isRTL ? "rtl" : "ltr",
          }}
          className="what-we-do-grid"
        >
          {/* Left column — doctor image */}
          <div style={{ position: "relative" }}>
            <div
              className="image-anime"
              style={{
                position: "relative",
                aspectRatio: "4 / 5",
                borderRadius: "20px",
                overflow: "hidden",
              }}
            >
              <Image
                src="/images/assets/dr-hanan-cc.jpg"
                alt="Dr. Hanan — Crystal Rose Clinics"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: "cover", objectPosition: "top center" }}
                priority={false}
              />

              {/* Years of experience badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: "28px",
                  ...(isRTL ? { right: "28px" } : { left: "28px" }),
                  backgroundColor: "var(--cr-primary)",
                  borderRadius: "14px",
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isRTL ? "flex-end" : "flex-start",
                  gap: "4px",
                  boxShadow: "0 8px 32px rgba(90, 61, 52, 0.3)",
                }}
              >
                <span
                  style={{
                    fontSize: "clamp(36px, 5vw, 52px)",
                    fontFamily: "var(--font-marcellus), serif",
                    fontWeight: 400,
                    color: "var(--cr-white)",
                    lineHeight: 1,
                  }}
                >
                  15+
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--cr-accent)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.whatWeDo.yearsLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Right column — text content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
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
                opacity: 0.75,
                fontSize: "16px",
                lineHeight: 1.8,
              }}
            >
              {t.whatWeDo.description}
            </p>

            {/* Services list */}
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {t.whatWeDo.services.map((service, index) => (
                <li
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexDirection: isRTL ? "row-reverse" : "row",
                    gap: "14px",
                  }}
                >
                  {/* Journey icon — first item gets icon-1, rest get icon-2 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      index === 0
                        ? "/images/icon-journey-1.svg"
                        : "/images/icon-journey-2.svg"
                    }
                    alt=""
                    aria-hidden="true"
                    width={32}
                    height={32}
                    style={{ flexShrink: 0 }}
                  />
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

            {/* Learn more link */}
            <a
              href="#services"
              className="readmore-btn"
              style={{
                alignSelf: isRTL ? "flex-end" : "flex-start",
                marginTop: "8px",
              }}
            >
              {t.whatWeDo.learnMore}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                style={{
                  transform: isRTL ? "scaleX(-1)" : "none",
                  flexShrink: 0,
                }}
              >
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Responsive grid override */}
      <style>{`
        @media (max-width: 900px) {
          .what-we-do-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
        }
      `}</style>
    </section>
  );
}
