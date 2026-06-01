"use client";

import { useEffect, useRef, useState } from "react";
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
      className="section-padding"
      style={{
        background: "var(--cr-secondary)",
        backgroundImage: "url(/images/approach-bg-shape.svg)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: isRTL ? "left center" : "right center",
        backgroundSize: "contain",
      }}
    >
      <div className="cr-container">
        <div className={`flex flex-col gap-12 lg:gap-16 items-center ${isRTL ? "lg:flex-row-reverse" : "lg:flex-row"}`}>

          {/* Text column */}
          <div className={`flex-1 ${reveal}`}>
            <span className="section-tag">{t.aboutPage.servicesTag}</span>
            <h2 className="mt-3 mb-5">{t.aboutPage.servicesHeading}</h2>
            <p className="mb-8 text-base leading-relaxed" style={{ color: "var(--cr-muted-foreground, #8a6d62)" }}>
              {t.aboutPage.servicesDescription}
            </p>

            <div className="flex flex-col gap-6">
              {approachItems.map((item) => (
                <div
                  key={item.title}
                  className={`flex gap-4 ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: "#fff", boxShadow: "0 2px 12px rgba(90,61,52,0.1)" }}
                  >
                    <img src={item.icon} alt={item.title} style={{ width: 32, height: 32 }} />
                  </div>
                  <div className={isRTL ? "text-right" : ""}>
                    <h3
                      className="mb-1 text-base font-semibold"
                      style={{ color: "var(--cr-primary)" }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--cr-muted-foreground, #8a6d62)" }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Image column */}
          <div className={`flex-1 w-full max-w-[480px] lg:max-w-none ${revealDelay}`}>
            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "4/5" }}>
                <img
                  src="/images/assets/dr-hanan-18.jpg"
                  alt="Our Approach"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              {/* 24/7 badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: 24,
                  left: isRTL ? "auto" : 24,
                  right: isRTL ? 24 : "auto",
                  background: "var(--cr-primary)",
                  borderRadius: 12,
                  padding: "12px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                }}
              >
                <img src="/images/icon-phone.svg" alt="support" style={{ width: 20, height: 20, filter: "brightness(0) invert(1)" }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>
                    {t.aboutPage.supportLabel}
                  </p>
                  <a
                    href={`tel:${t.aboutPage.phone.replace(/\s/g, "")}`}
                    className="text-sm font-bold"
                    style={{ color: "#fff" }}
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
