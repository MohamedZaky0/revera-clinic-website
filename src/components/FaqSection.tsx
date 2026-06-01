"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function FaqSection() {
  const { t, isRTL } = useLanguage();
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="section-padding bg-white">
      <div className="cr-container">
        <div className={`flex flex-col gap-12 lg:gap-16 items-center ${isRTL ? "lg:flex-row-reverse" : "lg:flex-row"}`}>

          {/* Images column */}
          <div className="flex-1 w-full max-w-[500px] lg:max-w-none">
            <div
              className="relative"
              style={{
                backgroundImage: "url(/images/faq-dot-img.svg)",
                backgroundRepeat: "no-repeat",
                backgroundPosition: isRTL ? "top left" : "top right",
              }}
            >
              <div className="overflow-hidden rounded-2xl" style={{ aspectRatio: "4/5", maxWidth: 380 }}>
                <img
                  src="/images/assets/dr-hanan-pp.jpg"
                  alt="Crystal Rose FAQ"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div
                className="absolute overflow-hidden rounded-2xl"
                style={{
                  width: 170,
                  height: 200,
                  bottom: -30,
                  right: isRTL ? "auto" : -20,
                  left: isRTL ? -20 : "auto",
                  border: "5px solid #fff",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                }}
              >
                <img
                  src="/images/assets/dr-hanan-cc.jpg"
                  alt="Clinic care"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>
          </div>

          {/* Accordion column */}
          <div className="flex-1" style={{ textAlign: isRTL ? "right" : "left" }}>
            <span className="section-tag">{t.aboutPage.faqTag}</span>
            <h2 className="mt-3 mb-8">{t.aboutPage.faqHeading}</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {t.aboutPage.faqs.map((faq, i) => {
                const isOpen = openIndex === i;
                return (
                  <div
                    key={i}
                    style={{
                      border: "1px solid var(--cr-divider)",
                      borderRadius: 12,
                      overflow: "hidden",
                      background: isOpen ? "var(--cr-secondary)" : "#fff",
                      transition: "background 0.3s ease",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? -1 : i)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexDirection: isRTL ? "row-reverse" : "row",
                        gap: 16,
                        padding: "18px 22px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: isRTL ? "right" : "left",
                        fontFamily: "var(--font-sora), sans-serif",
                        fontSize: 15,
                        fontWeight: 600,
                        color: "var(--cr-primary)",
                      }}
                    >
                      <span style={{ flex: 1 }}>{faq.question}</span>
                      <span
                        style={{
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: isOpen ? "var(--cr-primary)" : "var(--cr-secondary)",
                          color: isOpen ? "#fff" : "var(--cr-primary)",
                          transition: "all 0.3s ease",
                        }}
                      >
                        {isOpen ? <Minus size={15} /> : <Plus size={15} />}
                      </span>
                    </button>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateRows: isOpen ? "1fr" : "0fr",
                        transition: "grid-template-rows 0.3s ease",
                      }}
                    >
                      <div style={{ overflow: "hidden" }}>
                        <p
                          style={{
                            margin: 0,
                            padding: "0 22px 20px",
                            fontSize: 14,
                            lineHeight: 1.7,
                            color: "var(--cr-muted-foreground, #8a6d62)",
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
