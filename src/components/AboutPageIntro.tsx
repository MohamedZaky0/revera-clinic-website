"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

export function AboutPageIntro() {
  const { t, isRTL } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const reveal = `transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`;
  const revealDelay = `transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`;

  function handleBooking() {
    window.dispatchEvent(new CustomEvent("open-booking"));
  }

  return (
    <section ref={sectionRef} className="bg-white section-padding" style={{ overflow: "hidden" }}>
      <div className="cr-container" style={{ maxWidth: "1480px" }}>
        {/* Curved card container with beige background */}
        <div
          className="rounded-[24px] sm:rounded-[60px]"
          style={{
            position: "relative",
            backgroundColor: "var(--cr-secondary, #EDF1EC)",
            border: "1px solid rgba(196,174,124,0.35)",
            overflow: "hidden",
            padding: "clamp(40px, 6vw, 80px) clamp(24px, 5vw, 72px)",
          }}
        >
          {/* Background ornament — top-left leaf */}
          <div
            className="pointer-events-none absolute select-none opacity-[0.12] w-[240px] h-[240px]"
            style={{
              top: "-30px",
              left: isRTL ? "auto" : "-30px",
              right: isRTL ? "-30px" : "auto",
              transform: isRTL ? "scaleX(-1) rotate(-90deg)" : "rotate(-90deg)",
            }}
          >
            <Image src="/images/why-choose-bg-shape.svg" alt="" fill className="object-contain" />
          </div>

          {/* Background ornament — bottom-right leaf */}
          <div
            className="pointer-events-none absolute select-none opacity-[0.10] w-[260px] h-[260px]"
            style={{
              bottom: "-30px",
              right: isRTL ? "auto" : "-30px",
              left: isRTL ? "-30px" : "auto",
              transform: isRTL ? "scaleX(-1) rotate(90deg)" : "rotate(90deg)",
            }}
          >
            <Image src="/images/why-choose-bg-shape.svg" alt="" fill className="object-contain" />
          </div>

          <style>{`
            .api-grid {
              display: grid;
              grid-template-columns: 1fr 1.4fr;
              gap: clamp(32px, 5vw, 72px);
              align-items: center;
              position: relative;
              z-index: 10;
            }
            .api-img-col {
              position: relative;
              display: flex;
              justify-content: center;
            }
            .api-img-wrapper {
              position: relative;
              width: 100%;
              max-width: 420px;
            }
            .api-main-img {
              position: relative;
              width: 100%;
              aspect-ratio: 3 / 4;
              border-radius: 28px;
              overflow: hidden;
              box-shadow: 0 12px 36px rgba(90,61,52,0.10);
            }
            .api-second-img {
              position: absolute;
              bottom: 0;
              right: 0;
              width: 180px;
              height: 220px;
              border-radius: 20px;
              overflow: hidden;
              border: 4px solid #fff;
              box-shadow: 0 8px 30px rgba(0,0,0,0.12);
            }
            .rtl .api-second-img {
              right: auto;
              left: 0;
            }
            .api-rose-badge {
              position: absolute;
              bottom: 30%;
              right: -16px;
              width: 110px;
              height: 110px;
              border-radius: 50%;
              background: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(90,61,52,0.12);
              z-index: 5;
            }
            .rtl .api-rose-badge {
              right: auto;
              left: -16px;
            }
            .api-checklist {
              list-style: none;
              padding: 0;
              margin: 0 0 28px 0;
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .api-checklist li {
              display: flex;
              align-items: center;
              gap: 10px;
              font-size: 14px;
              font-weight: 500;
              color: var(--cr-primary);
            }
            .api-check-icon {
              width: 22px;
              height: 22px;
              border-radius: 6px;
              background-color: rgba(196,174,124,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .rtl .api-checklist li {
              flex-direction: row-reverse;
            }
            .api-cta-row {
              display: flex;
              align-items: center;
              gap: 16px;
              flex-wrap: wrap;
            }
            .rtl .api-cta-row {
              flex-direction: row-reverse;
            }
            .api-phone-block {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .rtl .api-phone-block {
              flex-direction: row-reverse;
            }
            @media (max-width: 1024px) {
              .api-grid {
                grid-template-columns: 1fr;
                gap: 48px;
              }
              .api-img-wrapper {
                max-width: 380px;
                margin: 0 auto;
              }
              .api-text-col {
                text-align: center;
              }
              .api-checklist li {
                justify-content: center;
              }
              .rtl .api-checklist li {
                justify-content: center;
              }
              .api-cta-row {
                justify-content: center;
              }
              .rtl .api-cta-row {
                justify-content: center;
              }
            }
          `}</style>

          <div className="api-grid" style={{ direction: isRTL ? "rtl" : "ltr" }}>
            {/* Left column: Overlapping doctor portraits */}
            <div className={`api-img-col ${reveal}`}>
              <div className="api-img-wrapper">
                {/* Main portrait */}
                <div className="api-main-img">
                  <Image
                    src="/images/doctor/portrait-about.png"
                    alt="Dr. Mahmoud Nasr Abu Obeid"
                    fill
                    sizes="(max-width: 1024px) 100vw, 420px"
                    style={{ objectFit: "cover", objectPosition: "center top" }}
                    priority
                  />
                </div>

                {/* Gold rose badge overlay */}
                <div className="api-rose-badge">
                  <Image
                    src="/images/main_logo.png"
                    alt="Revera Clinics"
                    width={88}
                    height={88}
                    style={{ objectFit: "contain", width: "auto", height: "auto", transform: "scale(1.7)" }}
                  />
                </div>

                {/* Second portrait — clinic / room image */}
                <div className="api-second-img">
                  <Image
                    src="/images/clinic/room.jpg"
                    alt="Revera Clinics"
                    fill
                    sizes="180px"
                    style={{ objectFit: "cover", objectPosition: "center" }}
                  />
                </div>
              </div>
            </div>

            {/* Right column: Text, checklist, CTAs */}
            <div
              className={`api-text-col ${revealDelay}`}
              style={{
                display: "flex",
                flexDirection: "column",
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {/* Tag */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                  justifyContent: isRTL ? "flex-end" : "flex-start",
                }}
              >
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="var(--cr-accent, #C4AE7C)" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    color: "var(--color-brand-secondary)",
                    textTransform: "uppercase",
                  }}
                >
                  {t.aboutPage.aboutTag}
                </span>
              </div>

              {/* Heading */}
              <h2
                className="font-heading"
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "clamp(26px, 3.5vw, 42px)",
                  lineHeight: 1.15,
                  fontWeight: 400,
                  color: "var(--cr-primary)",
                }}
              >
                {t.aboutPage.aboutHeading}
              </h2>

              {/* Description */}
              <p
                style={{
                  margin: "0 0 24px 0",
                  fontSize: "14.5px",
                  lineHeight: 1.75,
                  color: "var(--cr-muted-foreground, #5A6A51)",
                }}
              >
                {t.aboutPage.aboutDescription}
              </p>

              {/* Checklist */}
              <ul className="api-checklist">
                {t.aboutPage.aboutList.map((item) => (
                  <li key={item}>
                    <span className="api-check-icon">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--cr-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              {/* CTA row: Phone + Book Appointment */}
              <div className="api-cta-row">
                {/* Phone block */}
                <div className="api-phone-block">
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(196,174,124,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <img src="/images/icon-phone.svg" alt="phone" style={{ width: 20, height: 20 }} />
                  </div>
                  <div style={{ textAlign: isRTL ? "right" : "left" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--color-brand-secondary)",
                      }}
                    >
                      {t.aboutPage.needHelp}
                    </p>
                    <a
                      href={`tel:${t.aboutPage.phone.replace(/\s/g, "")}`}
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        textDecoration: "none",
                        transition: "color 0.2s ease",
                      }}
                      className="text-[#414E36] hover:text-[#5A6A51]"
                    >
                      {t.aboutPage.phone}
                    </a>
                  </div>
                </div>

                {/* Book Appointment button */}
                <button
                  onClick={handleBooking}
                  type="button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 24px",
                    borderRadius: "30px",
                    backgroundColor: "var(--cr-accent, #C4AE7C)",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    letterSpacing: "0.02em",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#B59E6A"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--cr-accent, #C4AE7C)"}
                >
                  {t.nav.makeAppointment}
                  {/* Arrow circle */}
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(255,255,255,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                      <path d="M5 13L13 5M13 5H6M13 5V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
