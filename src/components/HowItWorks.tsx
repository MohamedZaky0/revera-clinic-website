"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const STEP_ICONS = [
  "/images/icon-how-work-step-1.svg",
  "/images/icon-how-work-step-2.svg",
  "/images/icon-how-work-step-3.svg",
  "/images/icon-how-work-step-4.svg",
] as const;

export function HowItWorks() {
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

  const leftReveal = `transition-all duration-700 ${
    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
  }`;

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="bg-white section-padding"
      style={{ overflow: "hidden" }}
    >
      <div className="cr-container" style={{ maxWidth: "1320px" }}>
        <style>{`
          .hiw-grid {
            display: grid;
            grid-template-columns: 1fr 1.15fr;
            gap: clamp(40px, 6vw, 80px);
            align-items: flex-start;
          }
          .hiw-left-col {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            position: sticky;
            top: 100px;
          }
          .hiw-step-list {
            display: flex;
            flex-direction: column;
            gap: 40px;
          }
          .hiw-step-item {
            display: flex;
            gap: 24px;
            align-items: flex-start;
            transition: all 0.7s ease;
          }
          .hiw-icon-circle {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background-color: var(--cr-primary, #1F251A);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: transform 0.3s ease;
          }
          .hiw-step-item:hover .hiw-icon-circle {
            transform: scale(1.08);
          }
          .hiw-icon-img {
            width: 26px;
            height: 26px;
            object-fit: contain;
            filter: brightness(0) invert(1);
          }

          /* RTL adjustments */
          .rtl .hiw-step-item {
            flex-direction: row;
          }

          /* Desktop specific alignment: make left part sit higher */
          @media (min-width: 1025px) {
            .hiw-step-list {
              padding-top: 80px;
            }
            .hiw-left-col {
              margin-top: -40px;
              top: 70px;
            }
          }

          @media (max-width: 1024px) {
            .hiw-grid {
              grid-template-columns: 1fr;
              gap: 60px;
            }
            .hiw-left-col {
              position: static;
              align-items: center;
              text-align: center;
            }
            .rtl .hiw-left-col {
              align-items: center;
              text-align: center;
            }
            .hiw-tag-row {
              justify-content: center !important;
            }
            .hiw-btn-row {
              justify-content: center !important;
            }
          }

          @media (max-width: 480px) {
            .hiw-step-item {
              gap: 16px;
            }
            .hiw-icon-circle {
              width: 48px;
              height: 48px;
            }
            .hiw-icon-img {
              width: 22px;
              height: 22px;
            }
          }
        `}</style>

        <div className="hiw-grid" style={{ direction: isRTL ? "rtl" : "ltr" }}>
          {/* ── Left Column: Text & CTA ── */}
          <div
            className={`hiw-left-col ${leftReveal}`}
            style={{
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
              {t.howItWorks.tag}
            </span>

            {/* Title */}
            <h2
              className="font-heading"
              style={{
                margin: "0 0 16px 0",
                fontSize: "clamp(26px, 3.5vw, 42px)",
                lineHeight: 1.15,
                fontWeight: 400,
                color: "var(--cr-primary, #1F251A)",
              }}
            >
              {t.howItWorks.heading}
            </h2>

            {/* Description */}
            <p
              style={{
                margin: "0 0 32px 0",
                fontSize: "15px",
                lineHeight: 1.7,
                color: "var(--cr-primary, #1F251A)",
                opacity: 0.75,
              }}
            >
              {t.howItWorks.description}
            </p>

            {/* CTA Button Row */}
            <div
              className="hiw-btn-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexDirection: "row",
                width: "100%",
                justifyContent: "flex-start",
              }}
            >
              <a
                href="#appointment"
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
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#2e3a26"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--cr-primary)"}
              >
                {t.howItWorks.contactBtn}
              </a>
              <a
                href="#appointment"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  backgroundColor: "var(--color-brand-secondary)",
                  color: "var(--cr-white, #fff)",
                  textDecoration: "none",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--cr-primary)";
                  e.currentTarget.style.transform = "scale(1.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--color-brand-secondary)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  style={{ transform: isRTL ? "scaleX(-1)" : "none" }}
                >
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

          {/* ── Right Column: Step List ── */}
          <div className="hiw-step-list">
            {t.howItWorks.steps.map((step, index) => {
              const delay = index * 150;
              const stepReveal = `transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`;

              return (
                <div
                  key={step.number}
                  className={`hiw-step-item ${stepReveal}`}
                  style={{
                    transitionDelay: isVisible ? `${delay}ms` : "0ms",
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {/* Step icon in circular wrapper */}
                  <div className="hiw-icon-circle">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={STEP_ICONS[index] ?? STEP_ICONS[0]}
                      alt=""
                      className="hiw-icon-img"
                    />
                  </div>

                  {/* Step details */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <h3
                      className="font-heading"
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        fontWeight: 500,
                        color: "var(--cr-primary, #1F251A)",
                        lineHeight: 1.3,
                      }}
                    >
                      {step.number} {step.title}
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        lineHeight: 1.6,
                        color: "var(--cr-primary, #1F251A)",
                        opacity: 0.7,
                      }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
