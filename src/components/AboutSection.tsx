"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function AboutSection() {
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
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleBooking() {
    window.dispatchEvent(new CustomEvent("open-booking"));
  }

  const textReveal = `transition-all duration-700 ${
    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
  }`;

  const imageReveal = `transition-all duration-700 delay-300 ${
    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
  }`;

  return (
    <section ref={sectionRef} className="section-padding bg-white">
      <div className="cr-container">
        <div
          className={`flex flex-col gap-12 lg:gap-16 ${
            isRTL
              ? "lg:flex-row-reverse"
              : "lg:flex-row"
          } items-center`}
        >
          {/* Text column */}
          <div className={`flex-1 ${textReveal}`}>
            <span className="section-tag">{t.about.tag}</span>

            <h3
              className="mt-2 mb-3 font-sans text-base font-medium"
              style={{ color: "var(--cr-accent)" }}
            >
              {t.about.subtitle}
            </h3>

            <h2 className="mb-5">{t.about.heading}</h2>

            <p
              className="mb-8 text-base leading-relaxed"
              style={{ color: "var(--cr-muted-foreground, #8a6d62)" }}
            >
              {t.about.description}
            </p>

            {/* Services list */}
            <ul className="mb-8 flex flex-col gap-3">
              {t.about.services.map((service) => (
                <li key={service} className="flex items-center gap-3">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: "var(--cr-secondary)",
                      color: "var(--cr-primary)",
                    }}
                  >
                    <Check size={13} strokeWidth={2.5} />
                  </span>
                  <span className="text-sm font-medium">{service}</span>
                </li>
              ))}
            </ul>

            {/* CTA row */}
            <div
              className={`flex flex-wrap items-center gap-5 ${
                isRTL ? "flex-row-reverse" : ""
              }`}
            >
              <button
                onClick={handleBooking}
                className="btn-primary"
                type="button"
              >
                {t.nav.makeAppointment}
              </button>

              {/* Need help row */}
              <div
                className={`flex items-center gap-3 ${
                  isRTL ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--cr-secondary)" }}
                >
                  <Image
                    src="/images/icon-phone.svg"
                    alt="phone"
                    width={18}
                    height={18}
                  />
                </div>
                <div className={isRTL ? "text-right" : "text-left"}>
                  <p
                    className="mb-0 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--cr-accent)" }}
                  >
                    {t.about.needHelp}
                  </p>
                  <a
                    href={`tel:${t.about.phone.replace(/\s/g, "")}`}
                    className="text-sm font-semibold"
                    style={{ color: "var(--cr-primary)" }}
                  >
                    {t.about.phone}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Image column */}
          <div className={`flex-1 w-full max-w-[500px] lg:max-w-none ${imageReveal}`}>
            <div className="image-anime relative aspect-[5/6] w-full">
              <Image
                src="/images/assets/dr-hanan-8.png"
                alt="Crystal Rose Clinics"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
