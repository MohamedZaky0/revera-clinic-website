"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

export function AppointmentSection() {
  const { t, isRTL } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const revealClass = `transition-all duration-700 ${
    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
  }`;

  return (
    <section
      ref={sectionRef}
      id="appointment"
      className="bg-white section-padding"
      style={{ overflow: "hidden" }}
    >
      <div className="cr-container" style={{ maxWidth: "1480px" }}>
        {/* Curved Card Container with Beige Background */}
        <div
          className="ap-rounded-card rounded-[24px] sm:rounded-[60px]"
          style={{
            position: "relative",
            backgroundColor: "var(--cr-secondary, #EDF1EC)",
            border: "1px solid rgba(196,174,124,0.35)",
            overflow: "hidden",
            padding: "clamp(40px, 6vw, 80px) clamp(24px, 5vw, 72px)",
          }}
        >
          {/* Background ornaments (leaf outlines in all four corners) */}
          {/* Top-Right: Leaf ornament */}
          <div
            className="pointer-events-none absolute select-none opacity-[0.06] w-[300px] h-[300px]"
            style={{
              top: "-50px",
              right: "-50px",
              transform: isRTL ? "scaleX(-1)" : "none",
            }}
          >
            <Image
              src="/images/why-choose-bg-shape.svg"
              alt=""
              fill
              className="object-contain"
            />
          </div>

          {/* Bottom-Left: Leaf ornament */}
          <div
            className="pointer-events-none absolute select-none opacity-[0.06] w-[280px] h-[280px]"
            style={{
              bottom: "-50px",
              left: "-50px",
              transform: isRTL ? "scaleX(-1) rotate(45deg)" : "rotate(45deg)",
            }}
          >
            <Image
              src="/images/why-choose-bg-shape.svg"
              alt=""
              fill
              className="object-contain"
            />
          </div>

          {/* Top-Left: Leaf ornament */}
          <div
            className="pointer-events-none absolute select-none opacity-[0.06] w-[260px] h-[260px]"
            style={{
              top: "-30px",
              left: "-30px",
              transform: "rotate(-90deg)",
            }}
          >
            <Image
              src="/images/why-choose-bg-shape.svg"
              alt=""
              fill
              className="object-contain"
            />
          </div>

          {/* Bottom-Right: Leaf ornament */}
          <div
            className="pointer-events-none absolute select-none opacity-[0.06] w-[260px] h-[260px]"
            style={{
              bottom: "-30px",
              right: "-30px",
              transform: "rotate(120deg)",
            }}
          >
            <Image
              src="/images/why-choose-bg-shape.svg"
              alt=""
              fill
              className="object-contain"
            />
          </div>

          <style>{`
            .ap-grid {
              display: grid;
              grid-template-columns: 1fr 1.3fr;
              gap: clamp(40px, 6vw, 80px);
              align-items: center;
              position: relative;
              z-index: 10;
            }
            .ap-image-col {
              display: flex;
              justify-content: center;
              position: relative;
              width: 100%;
            }
            .ap-image-wrapper {
              position: relative;
              width: 100%;
              max-width: 360px;
            }
            .ap-image-backdrop {
              position: absolute;
              bottom: 0;
              left: -16px;
              width: 100%;
              height: 96%;
              border-radius: 200px 200px 0 0;
              background-color: #EDF1EC;
              z-index: 1;
            }
            .rtl .ap-image-backdrop {
              left: auto;
              right: -16px;
            }
            .ap-image-container {
              position: relative;
              width: 100%;
              aspect-ratio: 3.2 / 4.4;
              border-radius: 200px 200px 0 0;
              overflow: hidden;
              z-index: 2;
              box-shadow: 0 15px 35px rgba(90, 61, 52, 0.08);
            }
            .ap-input-custom {
              background-color: #fff;
              border: 1px solid rgba(196, 174, 124, 0.4);
              border-radius: 14px;
              padding: 14px 20px;
              font-size: 14px;
              color: var(--cr-primary);
              width: 100%;
              transition: all 0.3s ease;
              outline: none;
            }
            .ap-input-custom:focus {
              border-color: var(--cr-primary);
              box-shadow: 0 0 0 3px rgba(90, 61, 52, 0.05);
            }

            @media (max-width: 1024px) {
              .ap-grid {
                grid-template-columns: 1fr;
                gap: 50px;
              }
              .ap-text-col {
                text-align: center;
              }
              .ap-tag-row {
                justify-content: center !important;
              }
              .ap-image-wrapper {
                max-width: 320px;
              }
            }
          `}</style>

          <div className="ap-grid" style={{ direction: isRTL ? "rtl" : "ltr" }}>
            {/* ── Left Column: Support Image & Backdrop ── */}
            <div className="ap-image-col">
              <div className={`ap-image-wrapper ${revealClass}`}>
                {/* Gold Arch Backdrop */}
                <div className="ap-image-backdrop" />

                {/* Headset support woman image */}
                <div className="ap-image-container">
                  <Image
                    src="/images/clinic/support-agent.jpg"
                    alt="Contact support — Revera Clinics"
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    style={{ objectFit: "cover", objectPosition: "center top" }}
                    priority
                  />
                </div>
              </div>
            </div>

            {/* ── Right Column: Message Us Form ── */}
            <div
              className={`ap-text-col ${revealClass}`}
              style={{
                display: "flex",
                flexDirection: "column",
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {/* Gold tagline icon */}
              <div
                className="ap-tag-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "16px",
                  direction: isRTL ? "rtl" : "ltr",
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-brand-secondary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
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
                  {t.appointment.tag}
                </span>
              </div>

              {/* Title */}
              <h2
                className="font-heading"
                style={{
                  margin: "0 0 32px 0",
                  fontSize: "clamp(26px, 3.5vw, 42px)",
                  lineHeight: 1.15,
                  fontWeight: 400,
                  color: "var(--cr-primary, #1F251A)",
                }}
              >
                {t.appointment.heading}
              </h2>

              {/* Form */}
              <form
                onSubmit={(e) => e.preventDefault()}
                className="flex flex-col gap-4"
                noValidate
              >
                {/* First Name + Last Name */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    className="ap-input-custom"
                    placeholder={t.appointment.fields.firstName}
                    aria-label={t.appointment.fields.firstName}
                  />
                  <input
                    type="text"
                    className="ap-input-custom"
                    placeholder={t.appointment.fields.lastName}
                    aria-label={t.appointment.fields.lastName}
                  />
                </div>

                {/* Email + Phone */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    type="email"
                    className="ap-input-custom"
                    placeholder={t.appointment.fields.email}
                    aria-label={t.appointment.fields.email}
                  />
                  <input
                    type="tel"
                    className="ap-input-custom"
                    placeholder={t.appointment.fields.phone}
                    aria-label={t.appointment.fields.phone}
                  />
                </div>

                {/* Message */}
                <textarea
                  className="ap-input-custom resize-none"
                  rows={4}
                  placeholder={t.appointment.fields.message}
                  aria-label={t.appointment.fields.message}
                  style={{ minHeight: "120px" }}
                />

                {/* Submit button */}
                <button
                  type="submit"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "14px 28px",
                    borderRadius: "30px",
                    backgroundColor: "var(--color-brand-primary)",
                    color: "var(--cr-white, #fff)",
                    fontSize: "15px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    letterSpacing: "0.03em",
                    marginTop: "8px",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#2e3a26"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-brand-primary)"}
                >
                  {t.appointment.sendBtn}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
