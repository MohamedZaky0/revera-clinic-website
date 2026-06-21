"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Phone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function WhyChooseUs() {
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

  const textReveal = `transition-all duration-700 ${
    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
  }`;

  const imageReveal = `transition-all duration-700 delay-300 ${
    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
  }`;

  return (
    <section
      ref={sectionRef}
      id="why-choose-us"
      className="bg-white section-padding"
      style={{ overflow: "hidden" }}
    >
      <div className="cr-container" style={{ maxWidth: "1480px" }}>
        {/* Rounded Card Wrapper with Beige Background */}
        <div
          style={{
            position: "relative",
            backgroundColor: "var(--cr-secondary, #EDF1EC)",
            borderRadius: "32px",
            border: "1px solid rgba(196,174,124,0.35)",
            overflow: "hidden",
            padding: "clamp(40px, 6vw, 80px) clamp(24px, 5vw, 72px)",
          }}
        >
          {/* Curved section background decorations */}
          <div
            className="pointer-events-none absolute inset-0 select-none opacity-[0.15]"
            aria-hidden="true"
            style={{
              transform: isRTL ? "scaleX(-1)" : "none",
            }}
          >
            <Image
              src="/images/why-choose-bg-shape.svg"
              alt=""
              fill
              className="object-cover"
              priority
            />
          </div>

          <style>{`
            .wcu-grid {
              display: grid;
              grid-template-columns: 1fr 1.2fr;
              gap: clamp(40px, 6vw, 80px);
              align-items: center;
              position: relative;
              z-index: 10;
            }
            .wcu-image-col {
              position: relative;
              width: 100%;
              display: flex;
              justify-content: center;
            }
            .wcu-image-container {
              position: relative;
              width: 100%;
              height: 450px;
              max-width: 460px;
            }
            .wcu-left-img {
              position: absolute;
              top: 0;
              left: 0;
              width: 250px;
              height: 330px;
              border-radius: 30px;
              overflow: hidden;
              box-shadow: 0 12px 32px rgba(90, 61, 52, 0.08);
            }
            .wcu-right-backing {
              position: absolute;
              bottom: 0;
              right: 0;
              width: 280px;
              height: 330px;
              background-color: var(--color-brand-secondary);
              border-radius: 30px;
              z-index: 2;
              box-shadow: 0 12px 32px rgba(90, 61, 52, 0.12);
            }
            .wcu-right-img {
              position: absolute;
              top: 0;
              left: 0;
              width: 235px;
              height: 100%;
              border-radius: 30px;
              overflow: hidden;
            }
            .wcu-vertical-text {
              position: absolute;
              right: 0;
              top: 0;
              bottom: 0;
              width: 45px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .wcu-vertical-span {
              transform: rotate(-90deg);
              transform-origin: center;
              white-space: nowrap;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.15em;
              color: #fff;
              text-transform: uppercase;
            }

            /* RTL support classes */
            .rtl .wcu-left-img {
              left: auto;
              right: 0;
            }
            .rtl .wcu-right-backing {
              right: auto;
              left: 0;
            }
            .rtl .wcu-right-img {
              left: auto;
              right: 0;
            }
            .rtl .wcu-vertical-text {
              right: auto;
              left: 0;
            }
            .rtl .wcu-vertical-span {
              transform: rotate(90deg);
            }

            @media (max-width: 1024px) {
              .wcu-grid {
                grid-template-columns: 1fr;
                gap: 50px;
              }
              .wcu-text-col {
                text-align: center;
              }
              .wcu-tag-row {
                justify-content: center !important;
              }
              .wcu-contact-row {
                justify-content: center !important;
              }
            }

            @media (max-width: 480px) {
              .wcu-image-container {
                height: 330px;
                max-width: 325px;
              }
              .wcu-left-img {
                width: 175px;
                height: 245px;
                border-radius: 20px;
              }
              .wcu-right-backing {
                width: 200px;
                height: 245px;
                border-radius: 20px;
              }
              .wcu-right-img {
                width: 165px;
                border-radius: 20px;
              }
              .wcu-vertical-text {
                width: 35px;
              }
              .wcu-vertical-span {
                font-size: 8px;
                letter-spacing: 0.1em;
              }
            }
          `}</style>

          <div className="wcu-grid" style={{ direction: isRTL ? "rtl" : "ltr" }}>
            {/* ── Left Column: Overlapping Images ── */}
            <div className="wcu-image-col">
              <div className={`wcu-image-container ${imageReveal}`}>
                {/* Dentist room / purple chair image */}
                <div className="wcu-left-img">
                  <Image
                    src="/images/clinic/treatment.jpg"
                    alt="Dental clinic room — Revera Clinics"
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 400px"
                    style={{ objectFit: "cover", objectPosition: "center" }}
                  />
                </div>

                {/* Backing box containing treatment image + vertical experience text */}
                <div className="wcu-right-backing">
                  {/* Doctor performing treatment image */}
                  <div className="wcu-right-img">
                    <Image
                      src="/images/clinic/room.jpg"
                      alt="Skin treatment — Revera Clinics"
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      style={{ objectFit: "cover", objectPosition: "center" }}
                    />
                  </div>

                  {/* Vertical Experience text */}
                  <div className="wcu-vertical-text">
                    <span className="wcu-vertical-span">
                      {t.whyChooseUs.yearsLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Column: Text & Content ── */}
            <div
              className={`wcu-text-col ${textReveal}`}
              style={{
                display: "flex",
                flexDirection: "column",
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {/* Tag with Golden Icon */}
              <span
                className="section-tag"
                style={{
                  marginBottom: "16px",
                }}
              >
                <img
                  src="/images/main_logo.png"
                  alt=""
                  style={{ width: 40, height: 40, objectFit: "contain", opacity: 0.8 }}
                />
                {t.whyChooseUs.tag}
              </span>

              {/* Main Heading */}
              <h2
                className="font-heading"
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "clamp(26px, 3.5vw, 40px)",
                  lineHeight: 1.15,
                  fontWeight: 400,
                  color: "var(--cr-primary, #1F251A)",
                }}
              >
                {t.whyChooseUs.heading}
              </h2>

              {/* Description Paragraph */}
              <p
                style={{
                  margin: "0 0 24px 0",
                  fontSize: "15px",
                  lineHeight: 1.7,
                  color: "var(--cr-primary, #1F251A)",
                  opacity: 0.75,
                }}
              >
                {t.whyChooseUs.description}
              </p>

              {/* Premium Italic Blockquote */}
              <p
                className="font-heading italic"
                style={{
                  margin: "0 0 32px 0",
                  fontSize: "clamp(15px, 1.8vw, 17px)",
                  lineHeight: 1.6,
                  color: "var(--cr-primary, #1F251A)",
                  fontWeight: 500,
                  opacity: 0.9,
                }}
              >
                {t.whyChooseUs.quote}
              </p>

              {/* Contact Info Row */}
              <div
                className="wcu-contact-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  justifyContent: "flex-start",
                  flexDirection: "row",
                }}
              >
                {/* Circular Phone Button */}
                <a
                  href={`tel:${t.whyChooseUs.phone.replace(/\s/g, "")}`}
                  style={{
                    display: "flex",
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "#1F251A",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFFFFF",
                    transition: "transform 0.3s ease, background-color 0.3s ease",
                    flexShrink: 0,
                  }}
                  className="hover:scale-108"
                >
                  <Phone size={18} fill="currentColor" stroke="none" />
                </a>

                {/* Contact Labels */}
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "var(--cr-primary, #1F251A)",
                    display: "flex",
                    gap: "6px",
                    flexDirection: "row",
                  }}
                >
                  <span style={{ color: "var(--color-brand-secondary)" }}>
                    {t.whyChooseUs.contactLabel}
                  </span>
                  <a
                    href={`tel:${t.whyChooseUs.phone.replace(/\s/g, "")}`}
                    style={{
                      color: "var(--cr-primary, #1F251A)",
                      textDecoration: "none",
                      transition: "color 0.2s ease",
                      display: "inline-block",
                    }}
                    dir="ltr"
                    className="hover:text-brand-secondary hover:underline"
                  >
                    {t.whyChooseUs.phone}
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
