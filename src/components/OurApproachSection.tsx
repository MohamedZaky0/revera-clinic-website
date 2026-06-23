"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

export function OurApproachSection() {
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
  const revealDelay = `transition-all duration-700 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`;

  const approachItems = [
    {
      icon: "/images/icon-mission.svg",
      title: t.aboutPage.skinCareTitle,
      description: t.aboutPage.skinCareDescription,
    },
    {
      icon: "/images/icon-vision.svg",
      title: t.aboutPage.hairCareTitle,
      description: t.aboutPage.hairCareDescription,
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="bg-white section-padding"
      style={{ overflow: "hidden" }}
    >
      <div className="cr-container" style={{ maxWidth: "1480px" }}>
        {/* Curved card — beige background */}
        <div
          className="rounded-[24px] sm:rounded-[60px]"
          style={{
            position: "relative",
            backgroundColor: "var(--cr-secondary, #EDF1EC)",
            border: "1px solid rgba(196,174,124,0.3)",
            overflow: "hidden",
            padding: "clamp(40px, 6vw, 72px) clamp(24px, 5vw, 72px)",
          }}
        >
          {/* Leaf ornament — top left */}
          <div
            className="pointer-events-none absolute select-none w-[220px] h-[220px]"
            style={{
              top: "-20px",
              left: isRTL ? "auto" : "-20px",
              right: isRTL ? "-20px" : "auto",
              opacity: 0.12,
              transform: isRTL ? "scaleX(-1) rotate(-90deg)" : "rotate(-90deg)",
            }}
          >
            <Image src="/images/why-choose-bg-shape.svg" alt="" fill className="object-contain" />
          </div>

          {/* Leaf ornament — bottom right */}
          <div
            className="pointer-events-none absolute select-none w-[220px] h-[220px]"
            style={{
              bottom: "-20px",
              right: isRTL ? "auto" : "-20px",
              left: isRTL ? "-20px" : "auto",
              opacity: 0.10,
              transform: isRTL ? "scaleX(-1) rotate(90deg)" : "rotate(90deg)",
            }}
          >
            <Image src="/images/why-choose-bg-shape.svg" alt="" fill className="object-contain" />
          </div>

          <style>{`
            .oas2-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: clamp(32px, 5vw, 64px);
              align-items: center;
              position: relative;
              z-index: 10;
            }
            .oas2-item-card {
              background: #fff;
              border-radius: 20px;
              padding: 28px 24px;
              display: flex;
              flex-direction: column;
              gap: 20px;
              box-shadow: 0 2px 16px rgba(90,61,52,0.06);
              margin-top: 24px;
            }
            .oas2-item {
              display: flex;
              align-items: flex-start;
              gap: 16px;
            }
            .rtl-oas2 .oas2-item {
              text-align: right;
            }
            .oas2-icon {
              width: 52px;
              height: 52px;
              border-radius: 50%;
              background-color: rgba(90,61,52,0.08);
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .oas2-img-wrapper {
              position: relative;
              width: 100%;
            }
            .oas2-clinic-img {
              position: relative;
              width: 100%;
              aspect-ratio: 4 / 3.2;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 8px 28px rgba(90,61,52,0.12);
            }
            .oas2-doctor-img {
              position: absolute;
              bottom: -16px;
              left: isRTL ? auto : 24px;
              width: 140px;
              height: 160px;
              border-radius: 80px 80px 80px 80px;
              overflow: hidden;
              border: 4px solid #fff;
              box-shadow: 0 6px 20px rgba(0,0,0,0.14);
            }
            .oas2-support-badge {
              position: absolute;
              top: 16px;
              right: 16px;
              background: var(--cr-primary, #414E36);
              border-radius: 14px;
              padding: 12px 18px;
              display: flex;
              align-items: center;
              gap: 10px;
              box-shadow: 0 4px 16px rgba(90,61,52,0.25);
            }
            .rtl-oas2 .oas2-support-badge {
              right: auto;
              left: 16px;
            }
            @media (max-width: 1024px) {
              .oas2-grid {
                grid-template-columns: 1fr;
                gap: 40px;
              }
              .oas2-text-col {
                text-align: center;
              }
              .rtl-oas2 .oas2-item {
                justify-content: center;
                flex-direction: row;
                text-align: left;
              }
            }
            @media (max-width: 640px) {
              .oas2-support-badge {
                position: relative !important;
                top: auto !important;
                right: auto !important;
                left: auto !important;
                margin: 20px auto 0 !important;
                width: fit-content;
                justify-content: center;
              }
            }
          `}</style>

          <div
            className={`oas2-grid ${isRTL ? "rtl-oas2" : ""}`}
            style={{ direction: isRTL ? "rtl" : "ltr" }}
          >
            {/* LEFT: text + white card */}
            <div className={`oas2-text-col ${reveal}`}>
              {/* Tag */}
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
                  {t.aboutPage.servicesTag}
                </span>
              </div>

              {/* Heading */}
              <h2
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "clamp(26px, 3.5vw, 40px)",
                  lineHeight: 1.15,
                  fontWeight: 400,
                  color: "var(--cr-primary)",
                  fontFamily: "var(--font-marcellus), serif",
                }}
              >
                {t.aboutPage.servicesHeading}
              </h2>

              {/* Description */}
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  lineHeight: 1.75,
                  color: "var(--cr-muted-foreground, #5A6A51)",
                }}
              >
                {t.aboutPage.servicesDescription}
              </p>

              {/* White card with approach items */}
              <div className="oas2-item-card">
                {approachItems.map((item, i) => (
                  <div key={item.title}>
                    {i > 0 && (
                      <div style={{ borderTop: "1px solid rgba(196,174,124,0.25)", marginBottom: "20px" }} />
                    )}
                    <div className="oas2-item">
                      <div className="oas2-icon">
                        <img
                          src={item.icon}
                          alt={item.title}
                          style={{ width: 24, height: 24, filter: "brightness(0) saturate(100%) invert(20%) sepia(25%) saturate(500%) hue-rotate(340deg)" }}
                        />
                      </div>
                      <div>
                        <h3
                          style={{
                            margin: "0 0 6px 0",
                            fontSize: "15px",
                            fontWeight: 600,
                            color: "var(--cr-primary)",
                          }}
                        >
                          {item.title}
                        </h3>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "13px",
                            lineHeight: 1.7,
                            color: "var(--cr-muted-foreground, #5A6A51)",
                          }}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: clinic room image + doctor portrait + support badge */}
            <div className={`oas2-img-wrapper ${revealDelay}`}>
              {/* Clinic/room image */}
              <div className="oas2-clinic-img">
                <Image
                  src="/images/clinic/room.jpg"
                  alt="Revera Clinic"
                  fill
                  sizes="(max-width: 1024px) 100vw, 480px"
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
              </div>

              {/* Doctor portrait — overlapping bottom-left */}
              {/* 
              <div
                style={{
                  position: "absolute",
                  bottom: "-20px",
                  left: isRTL ? "auto" : "24px",
                  right: isRTL ? "24px" : "auto",
                  width: "130px",
                  height: "155px",
                  borderRadius: "70px",
                  overflow: "hidden",
                  border: "4px solid #fff",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
                }}
              >
                <Image
                  src="/images/doctor/portrait-about.png"
                  alt="Doctor"
                  fill
                  sizes="130px"
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                />
              </div>

              {/* 24/7 Support badge — top right */}
              <div className="oas2-support-badge">
                <img
                  src="/images/icon-phone.svg"
                  alt="support"
                  style={{ width: 20, height: 20, filter: "brightness(0) invert(1)" }}
                />
                <div>
                  <p
                    style={{
                      margin: "0 0 2px 0",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {t.aboutPage.supportLabel}
                  </p>
                  <a
                    href={`tel:${t.aboutPage.phone.replace(/\s/g, "")}`}
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.85)",
                      textDecoration: "none",
                    }}
                  >
                    {t.aboutPage.phone}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
