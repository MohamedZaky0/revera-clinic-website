"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

export function OurJourneySection() {
  const { t, isRTL } = useLanguage();

  return (
    <section className="bg-white section-padding" style={{ overflow: "hidden" }}>
      <div className="cr-container" style={{ maxWidth: "1480px" }}>

        {/* Dark brown curved card */}
        <div
          style={{
            position: "relative",
            backgroundColor: "var(--cr-primary, #414E36)",
            borderRadius: "60px",
            overflow: "hidden",
            padding: "clamp(40px, 6vw, 72px) clamp(24px, 5vw, 72px)",
          }}
        >
          {/* Leaf ornament — top right */}
          <div
            className="pointer-events-none absolute select-none"
            style={{
              top: "-10px",
              right: isRTL ? "auto" : "-10px",
              left: isRTL ? "-10px" : "auto",
              width: "200px",
              height: "200px",
              opacity: 0.08,
              transform: isRTL ? "scaleX(-1)" : "none",
            }}
          >
            <Image src="/images/footer-bg-shape.svg" alt="" fill className="object-contain" />
          </div>

          {/* Leaf ornament — bottom right */}
          <div
            className="pointer-events-none absolute select-none"
            style={{
              bottom: "-10px",
              right: isRTL ? "auto" : "-10px",
              left: isRTL ? "-10px" : "auto",
              width: "180px",
              height: "180px",
              opacity: 0.06,
              transform: isRTL ? "scaleX(-1) rotate(90deg)" : "rotate(90deg)",
            }}
          >
            <Image src="/images/footer-bg-shape.svg" alt="" fill className="object-contain" />
          </div>

          <div style={{ position: "relative", zIndex: 1, direction: isRTL ? "rtl" : "ltr" }}>

            {/* Tag */}
            <span
              className="section-tag"
              style={{
                marginBottom: "14px",
                color: "rgba(255, 255, 255, 0.6)",
              }}
            >
              <img
                src="/images/main_logo.png"
                alt=""
                style={{
                  width: 40,
                  height: 40,
                  objectFit: "contain",
                  filter: "brightness(0) saturate(0) invert(1) opacity(0.6)",
                }}
              />
              {t.aboutPage.storiesTag}
            </span>

            {/* Heading */}
            <h2
              style={{
                margin: "0 0 28px",
                fontSize: "clamp(26px, 3.5vw, 40px)",
                lineHeight: 1.15,
                fontWeight: 400,
                color: "#fff",
                fontFamily: "var(--font-marcellus), serif",
              }}
            >
              {t.aboutPage.storiesHeading}
            </h2>

            {/* 2×2 Checklist grid */}
            <ul
              style={{
                listStyle: "none",
                margin: "0 0 28px",
                padding: 0,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px 40px",
              }}
            >
              {t.aboutPage.storiesList.map((item) => (
                <li
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexDirection: "row",
                  }}
                >
                  <span
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "5px",
                      background: "rgba(255,255,255,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span style={{ fontSize: "13.5px", color: "rgba(255,255,255,0.82)", fontWeight: 500 }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(255,255,255,0.12)", marginBottom: "28px" }} />

            {/* Journey items row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "32px",
              }}
            >
              {t.aboutPage.journeyItems.map((item, i) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    flexDirection: "row",
                  }}
                >
                  {/* Circular icon */}
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={i === 0 ? "/images/icon-journey-1.svg" : "/images/icon-journey-2.svg"}
                      alt=""
                      aria-hidden="true"
                      style={{
                        width: 26,
                        height: 26,
                        filter: "brightness(0) invert(1)",
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexDirection: "row",
              }}
            >
              <Link
                href="/contact"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "12px 26px",
                  borderRadius: "30px",
                  background: "rgba(255,255,255,0.12)",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                }}
              >
                {isRTL ? "تواصل معنا" : "Contact Us"}
              </Link>
              <Link
                href="/contact"
                aria-label="Contact us"
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)",
                  border: "1.5px solid rgba(255,255,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  textDecoration: "none",
                  transition: "all 0.25s ease",
                }}
              >
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
        </div>

      </div>
    </section>
  );
}
