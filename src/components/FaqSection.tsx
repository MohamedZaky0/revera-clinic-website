"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function FaqSection() {
  const { t, isRTL } = useLanguage();
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="section-padding bg-white" style={{ overflow: "hidden" }}>
      <div className="cr-container">

        <style>{`
          .faq-grid {
            display: grid;
            grid-template-columns: 1fr 1.3fr;
            gap: clamp(32px, 6vw, 80px);
            align-items: start;
          }
          .rtl-faq .faq-grid { direction: rtl; }

          /* Images column */
          .faq-img-wrapper {
            position: relative;
            width: 100%;
            padding-bottom: 115%;
          }

          @media (max-width: 1024px) {
            .faq-grid { grid-template-columns: 1fr; gap: 48px; direction: ltr !important; }
            .faq-img-wrapper { max-width: 400px; margin: 0 auto; }
          }

          /* FAQ accordion */
          .faq-item {
            border-bottom: 1px solid rgba(90, 106, 81, 0.25);
          }
          .faq-item:first-child {
            border-top: 1px solid rgba(90, 106, 81, 0.25);
          }
          .faq-question-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 20px 0;
            background: none;
            border: none;
            cursor: pointer;
            text-align: left;
          }
          .rtl-faq .faq-question-btn {
            flex-direction: row-reverse;
            text-align: right;
          }
          .faq-answer-wrap {
            display: grid;
            grid-template-rows: 0fr;
            transition: grid-template-rows 0.3s ease;
          }
          .faq-answer-wrap.open {
            grid-template-rows: 1fr;
          }
        `}</style>

        <div className={`faq-grid ${isRTL ? "rtl-faq" : ""}`}>

          {/* ── Left: overlapping doctor photos ── */}
          <div className="faq-img-wrapper">

            {/* Main photo — top-left, rounded corners */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: isRTL ? "auto" : 0,
                right: isRTL ? 0 : "auto",
                width: "56%",
                height: "74%",
                borderRadius: "20px",
                overflow: "hidden",
              }}
            >
              <Image
                src="/images/assets/dr-hanan-pp.jpg"
                alt="Doctor consultation"
                fill
                sizes="(max-width: 1024px) 100vw, 240px"
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
            </div>

            {/* Second photo — bottom-right, larger rounded corners, on top */}
            <div
              style={{
                position: "absolute",
                top: "37%",
                right: isRTL ? "auto" : 0,
                left: isRTL ? 0 : "auto",
                width: "65%",
                bottom: 0,
                borderRadius: "24px",
                overflow: "hidden",
                zIndex: 2,
              }}
            >
              <Image
                src="/images/assets/dr-hanan-cc.jpg"
                alt="Doctor"
                fill
                sizes="(max-width: 1024px) 100vw, 280px"
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
            </div>

            {/* Dot grid — bottom-left gap, below the main photo */}
            <div
              style={{
                position: "absolute",
                bottom: "10%",
                left: isRTL ? "auto" : "18%",
                right: isRTL ? "18%" : "auto",
                width: "85px",
                height: "85px",
                opacity: 0.6,
                zIndex: 1,
              }}
            >
              <Image
                src="/images/faq-dot-img.svg"
                alt=""
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* ── Right: FAQ accordion ── */}
          <div style={{ textAlign: isRTL ? "right" : "left" }}>

            {/* Tag */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "14px",
              }}
            >
              <img
                src="/images/main_logo.png"
                alt=""
                style={{ width: 18, height: 18, objectFit: "contain" }}
              />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  color: "var(--color-brand-secondary)",
                  textTransform: "uppercase",
                }}
              >
                {t.aboutPage.faqTag}
              </span>
            </div>

            {/* Heading */}
            <h2
              style={{
                margin: "0 0 32px",
                fontSize: "clamp(26px, 3.5vw, 42px)",
                lineHeight: 1.15,
                fontWeight: 400,
                color: "var(--cr-primary)",
                fontFamily: "var(--font-marcellus), serif",
              }}
            >
              {t.aboutPage.faqHeading}
            </h2>

            {/* Accordion */}
            <div>
              {t.aboutPage.faqs.map((faq, i) => {
                const isOpen = openIndex === i;
                return (
                  <div className="faq-item" key={i}>
                    <button
                      type="button"
                      className="faq-question-btn"
                      onClick={() => setOpenIndex(isOpen ? -1 : i)}
                    >
                      <span
                        style={{
                          flex: 1,
                          fontSize: "15px",
                          fontWeight: 500,
                          color: isOpen
                            ? "var(--color-brand-secondary)"
                            : "var(--cr-primary)",
                          transition: "color 0.2s",
                          fontFamily: "var(--font-sora), sans-serif",
                        }}
                      >
                        {faq.question}
                      </span>
                      <span
                        style={{
                          flexShrink: 0,
                          color: isOpen
                            ? "var(--color-brand-secondary)"
                            : "var(--cr-primary)",
                          opacity: isOpen ? 1 : 0.6,
                          transition: "all 0.2s",
                        }}
                      >
                        {isOpen
                          ? <ChevronUp size={18} />
                          : <ChevronDown size={18} />
                        }
                      </span>
                    </button>

                    <div className={`faq-answer-wrap ${isOpen ? "open" : ""}`}>
                      <div style={{ overflow: "hidden" }}>
                        <p
                          style={{
                            margin: 0,
                            paddingBottom: "20px",
                            fontSize: "13.5px",
                            lineHeight: 1.75,
                            color: "var(--cr-muted-foreground, #5A6A51)",
                          }}
                        >
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
