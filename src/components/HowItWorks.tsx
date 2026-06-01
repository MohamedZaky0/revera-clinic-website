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

  const headerReveal = `transition-all duration-700 ${
    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
  }`;

  return (
    <section ref={sectionRef} className="section-padding bg-white">
      <div className="cr-container">
        {/* ── Header ── */}
        <div className={`mb-12 text-center ${headerReveal}`}>
          <span className="section-tag">{t.howItWorks.tag}</span>
          <h2 className="mx-auto mt-2 max-w-2xl">{t.howItWorks.heading}</h2>
          <p
            className="mx-auto mt-4 max-w-xl text-base leading-relaxed"
            style={{ color: "var(--muted-foreground)" }}
          >
            {t.howItWorks.description}
          </p>
        </div>

        {/* ── Steps grid: 2×2 desktop, 1-col mobile ── */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {t.howItWorks.steps.map((step, index) => {
            const delay = index * 150;
            const cardReveal = `transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`;

            return (
              <div
                key={step.number}
                className={`group rounded-2xl border bg-white p-8 transition-shadow duration-300 hover:shadow-lg ${cardReveal}`}
                style={{
                  borderColor: "var(--border)",
                  transitionDelay: isVisible ? `${delay}ms` : "0ms",
                }}
              >
                {/* Step icon */}
                <div className="mb-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={STEP_ICONS[index] ?? STEP_ICONS[0]}
                    alt={step.title}
                    width={60}
                    height={60}
                  />
                </div>

                {/* Number + title row */}
                <div
                  className={`mb-3 flex items-baseline gap-2 ${
                    isRTL ? "flex-row-reverse" : ""
                  }`}
                >
                  <span
                    className="font-sans text-sm font-semibold"
                    style={{ color: "var(--cr-accent)" }}
                  >
                    {step.number}
                  </span>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: "var(--cr-primary)", fontFamily: "var(--font-heading)" }}
                  >
                    {step.title}
                  </h3>
                </div>

                {/* Description */}
                <p
                  className="mb-0 text-sm leading-relaxed"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── CTA button ── */}
        <div
          className={`mt-12 flex justify-center transition-all duration-700 delay-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <a href="#appointment" className="btn-outline capitalize">
            {t.howItWorks.contactBtn}
          </a>
        </div>
      </div>
    </section>
  );
}
