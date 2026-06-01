"use client";

import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function OurJourneySection() {
  const { t, isRTL } = useLanguage();

  return (
    <section
      className="dark-section section-padding"
      style={{
        position: "relative",
        overflow: "hidden",
        backgroundImage: "url(/images/journey-bg-shape.svg)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: isRTL ? "right top" : "left top",
        backgroundSize: "auto",
      }}
    >
      <div className="cr-container" style={{ position: "relative", zIndex: 1 }}>
        <div className={`flex flex-col gap-12 lg:gap-16 items-center ${isRTL ? "lg:flex-row-reverse" : "lg:flex-row"}`}>

          {/* Image */}
          <div className="flex-1 w-full max-w-[480px] lg:max-w-none">
            <div className="overflow-hidden rounded-2xl" style={{ aspectRatio: "5/4" }}>
              <img
                src="/images/assets/dr-hanan-11.jpg"
                alt="Your journey with Crystal Rose"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1" style={{ textAlign: isRTL ? "right" : "left" }}>
            <span
              className="section-tag"
              style={{ color: "var(--cr-accent)" }}
            >
              {t.aboutPage.storiesTag}
            </span>
            <h2 className="mt-3 mb-6" style={{ color: "#fff" }}>
              {t.aboutPage.storiesHeading}
            </h2>

            <ul style={{ listStyle: "none", margin: "0 0 32px", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {t.aboutPage.storiesList.map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "center", gap: 12, flexDirection: isRTL ? "row-reverse" : "row" }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.12)",
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    <Check size={13} strokeWidth={2.5} />
                  </span>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.85)" }}>{item}</span>
                </li>
              ))}
            </ul>

            {/* Journey highlight cards */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", flexDirection: isRTL ? "row-reverse" : "row" }}>
              {t.aboutPage.journeyItems.map((item, i) => (
                <div
                  key={item}
                  style={{
                    flex: "1 1 200px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    flexDirection: isRTL ? "row-reverse" : "row",
                    padding: "16px 18px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <img
                    src={i === 0 ? "/images/icon-journey-1.svg" : "/images/icon-journey-2.svg"}
                    alt=""
                    aria-hidden="true"
                    style={{ width: 36, height: 36, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
