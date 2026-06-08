"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

const WHATSAPP_NUMBER = "201035595691";

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
          style={{
            position: "relative",
            backgroundColor: "var(--cr-secondary, #EDF1EC)",
            borderRadius: "60px",
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
                    src="/images/assets/support-agent.png"
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
                  justifyContent: "flex-start",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-brand-secondary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
                onSubmit={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent("open-booking"));
                }}
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

                {/* Submit → opens booking modal */}
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

                {/* WhatsApp alternative */}
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    padding: "13px 28px",
                    borderRadius: "30px",
                    backgroundColor: "transparent",
                    border: "1.5px solid #25D366",
                    color: "#1a8a45",
                    fontSize: "15px",
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "all 0.3s ease",
                    letterSpacing: "0.03em",
                    width: "100%",
                    flexDirection: isRTL ? "row-reverse" : "row",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#25D366";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#1a8a45";
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.104.547 4.079 1.503 5.797L.057 23.882l6.263-1.43A11.948 11.948 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.015-1.376l-.36-.214-3.719.849.878-3.61-.234-.37A9.818 9.818 0 1112 21.818z"/>
                  </svg>
                  {t.appointment.whatsappBtn}
                </a>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
