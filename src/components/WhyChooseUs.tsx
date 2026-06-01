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
    <section ref={sectionRef} className="bg-section section-padding relative overflow-hidden">
      {/* Decorative background shape */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-1/2 select-none opacity-10"
        aria-hidden="true"
      >
        <Image
          src="/images/why-choose-bg-shape.svg"
          alt=""
          fill
          sizes="50vw"
          className="object-contain object-right-top"
        />
      </div>

      <div className="cr-container relative z-10">
        <div
          className={`flex flex-col items-center gap-12 lg:gap-16 ${
            isRTL ? "lg:flex-row-reverse" : "lg:flex-row"
          }`}
        >
          {/* ── Left: text column ── */}
          <div className={`flex-1 ${textReveal}`}>
            {/* Experience badge */}
            <div className="mb-4 inline-flex items-center gap-2">
              <span
                className="rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide"
                style={{
                  backgroundColor: "var(--cr-primary)",
                  color: "var(--cr-white)",
                }}
              >
                {t.whyChooseUs.yearsLabel}
              </span>
            </div>

            <span className="section-tag block">{t.whyChooseUs.tag}</span>

            <h2 className="mb-5 mt-2">{t.whyChooseUs.heading}</h2>

            <p
              className="mb-8 text-base leading-relaxed"
              style={{ color: "var(--muted-foreground)" }}
            >
              {t.whyChooseUs.description}
            </p>

            {/* Quote card */}
            <div
              className="rounded-2xl bg-white p-8 shadow-md"
              style={{ border: "1px solid var(--border)" }}
            >
              {/* Large opening quote mark */}
              <span
                className="mb-3 block font-heading text-5xl leading-none"
                style={{ color: "var(--cr-accent)" }}
                aria-hidden="true"
              >
                &ldquo;
              </span>

              <p
                className="mb-6 text-sm italic leading-relaxed"
                style={{ color: "var(--muted-foreground)" }}
              >
                {t.whyChooseUs.quote}
              </p>

              {/* Contact row */}
              <div
                className={`flex items-center gap-3 border-t pt-5 ${
                  isRTL ? "flex-row-reverse" : ""
                }`}
                style={{ borderColor: "var(--border)" }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--cr-secondary)" }}
                >
                  <Phone
                    size={15}
                    strokeWidth={2}
                    style={{ color: "var(--cr-primary)" }}
                  />
                </span>
                <div className={isRTL ? "text-right" : "text-left"}>
                  <p
                    className="mb-0 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--cr-accent)" }}
                  >
                    {t.whyChooseUs.contactLabel}
                  </p>
                  <a
                    href={`tel:${t.whyChooseUs.phone.replace(/\s/g, "")}`}
                    className="text-sm font-semibold"
                    style={{ color: "var(--cr-primary)" }}
                  >
                    {t.whyChooseUs.phone}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: doctor image ── */}
          <div
            className={`w-full max-w-[460px] flex-1 lg:max-w-none ${imageReveal}`}
          >
            <div className="image-anime relative aspect-[4/5] w-full">
              <Image
                src="/images/assets/dr-hanan-pp.jpg"
                alt="Dr. Hanan — Crystal Rose Clinics"
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
