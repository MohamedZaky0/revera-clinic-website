"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
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
    <section ref={sectionRef} className="section-padding bg-white">
      <div className="cr-container">
        <div className={`flex flex-col gap-12 lg:gap-16 items-center ${isRTL ? "lg:flex-row-reverse" : "lg:flex-row"}`}>

          {/* Images column */}
          <div className={`flex-1 w-full max-w-[520px] lg:max-w-none ${reveal}`}>
            <div
              className="relative"
              style={{
                backgroundImage: "url(/images/logo.png)",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "60%",
              }}
            >
              {/* Main image */}
              <div
                className="relative overflow-hidden rounded-2xl"
                style={{ aspectRatio: "3/4", maxWidth: 360 }}
              >
                <img
                  src="/images/assets/dr-hanan-8.png"
                  alt="Crystal Rose Clinics Doctor"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              {/* Logo circle badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: "30%",
                  right: isRTL ? "auto" : -20,
                  left: isRTL ? -20 : "auto",
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                }}
              >
                <img
                  src="/images/logo-face.png"
                  alt="Crystal Rose Logo"
                  style={{ width: 100, height: 100, objectFit: "contain" }}
                />
              </div>

              {/* Second image */}
              <div
                className="absolute overflow-hidden rounded-2xl"
                style={{
                  width: 180,
                  height: 220,
                  bottom: 0,
                  right: isRTL ? "auto" : 0,
                  left: isRTL ? 0 : "auto",
                  border: "4px solid #fff",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                }}
              >
                <img
                  src="/images/assets/dr-hanan2.jpg"
                  alt="Clinic"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "80% center" }}
                />
              </div>
            </div>
          </div>

          {/* Text column */}
          <div className={`flex-1 ${revealDelay}`}>
            <span className="section-tag">{t.aboutPage.aboutTag}</span>
            <h2 className="mt-3 mb-5">{t.aboutPage.aboutHeading}</h2>
            <p className="mb-8 text-base leading-relaxed" style={{ color: "var(--cr-muted-foreground, #8a6d62)" }}>
              {t.aboutPage.aboutDescription}
            </p>

            <ul className="mb-8 flex flex-col gap-3">
              {t.aboutPage.aboutList.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--cr-secondary)", color: "var(--cr-primary)" }}
                  >
                    <Check size={13} strokeWidth={2.5} />
                  </span>
                  <span className="text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <div className={`flex flex-wrap items-center gap-5 ${isRTL ? "flex-row-reverse" : ""}`}>
              <button onClick={handleBooking} className="btn-primary" type="button">
                {t.nav.makeAppointment}
              </button>
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--cr-secondary)" }}
                >
                  <img src="/images/icon-phone.svg" alt="phone" style={{ width: 18, height: 18 }} />
                </div>
                <div className={isRTL ? "text-right" : "text-left"}>
                  <p className="mb-0 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--cr-accent)" }}>
                    {t.aboutPage.needHelp}
                  </p>
                  <a href={`tel:${t.aboutPage.phone.replace(/\s/g, "")}`} className="text-sm font-semibold" style={{ color: "var(--cr-primary)" }}>
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
