"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, ArrowUpRight } from "lucide-react";
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
    <section ref={sectionRef} className="section-padding bg-white overflow-hidden">
      <div className="cr-container">
        <div
          className={`flex flex-col lg:flex-row gap-12 lg:gap-16 items-center ${
            isRTL ? "lg:flex-row-reverse" : ""
          }`}
        >
          {/* ── Left Column: Overlapping Portraits ── */}
          <div className={`flex-1 w-full max-w-[500px] lg:max-w-none ${imageReveal}`}>
            <div className="relative w-full aspect-[1.05] max-w-[480px] mx-auto">
              
              {/* Background Rose Ornament (Top-Left) */}
              <div 
                className={`absolute top-4 z-0 w-24 h-24 opacity-80 select-none pointer-events-none transition-all duration-500 ${
                  isRTL ? "right-16" : "left-16"
                }`}
              >
                <img
                  src="/images/main_logo.png"
                  alt=""
                  className="w-full h-full object-contain transition-all duration-500"
                  style={{
                    filter: "brightness(0) saturate(100%) invert(39%) sepia(13%) saturate(996%) hue-rotate(53deg) brightness(95%) contrast(88%)",
                    opacity: 0.35
                  }}
                />
              </div>

              {/* Left Foreground Portrait (Doctor in white coat) - Lower, on Left */}
              <div 
                className={`absolute bottom-0 w-[55%] aspect-[3/4] rounded-[40px] z-20 overflow-hidden shadow-[0_15px_40px_rgba(90,61,52,0.12)] transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(90,61,52,0.18)] ${
                  isRTL ? "right-0" : "left-0"
                }`}
              >
                <Image
                  src="/images/doctor/portrait-about.jpg"
                  alt="Dr. Mahmoud Nasr Abu Obeid"
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover object-top"
                  priority
                />
              </div>

              {/* Right Background Portrait (Doctor in green scrubs) - Higher, on Right */}
              <div 
                className={`absolute top-0 w-[55%] aspect-[3/4] rounded-[40px] z-10 overflow-hidden shadow-[0_10px_30px_rgba(90,61,52,0.08)] transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_15px_40px_rgba(90,61,52,0.12)] ${
                  isRTL ? "left-0" : "right-0"
                }`}
              >
                <Image
                  src="/images/doctor/portrait-main.jpg"
                  alt="Dr. Mahmoud Nasr Abu Obeid"
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover object-top"
                  priority
                />
              </div>

              {/* Central Rose Badge Shield - Sitting Over Bottom Overlap */}
              <div 
                className={`absolute z-30 w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-110 bottom-[74px] ${
                  isRTL 
                    ? "right-[56%] translate-x-1/2" 
                    : "left-[56%] -translate-x-1/2"
                }`}
              >
                <img
                  src="/images/main_logo.png"
                  alt="Revera logo"
                  className="w-full h-full object-contain"
                  style={{ transform: "scale(1.7)" }}
                />
              </div>
            </div>
          </div>

          {/* ── Right Column: Text & Layout ── */}
          <div className={`flex-1 ${textReveal}`}>
            
            {/* Tagline Row */}
            <div className={`flex items-center gap-2 mb-3 ${isRTL ? "flex-row-reverse justify-start" : ""}`}>
              <img src="/images/main_logo.png" alt="" className="w-5 h-5 object-contain" />
              <span className="section-tag mb-0 font-sans tracking-[0.15em] font-semibold text-xs text-[#5A6A51] uppercase">
                {t.about.tag}
              </span>
            </div>

            {/* Subtitle / Main Heading */}
            <h2 
              className={`mb-6 text-4xl lg:text-5xl font-normal leading-tight text-[#414E36] font-heading ${
                isRTL ? "text-right" : "text-left"
              }`}
            >
              {t.about.subtitle}
            </h2>

            {/* Description Paragraph */}
            <p
              className={`mb-8 text-base leading-relaxed text-[#5A6A51] ${
                isRTL ? "text-right" : "text-left"
              }`}
            >
              {t.about.description}
            </p>

            {/* Sub-grid for Checklist and Interior Clinic Image */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center mb-10">
              
              {/* Checklist Column */}
              <div className={`md:col-span-7 ${isRTL ? "md:order-2 text-right" : "md:order-1 text-left"}`}>
                <ul className="flex flex-col gap-4">
                  {t.about.services.map((service) => (
                    <li 
                      key={service} 
                      className={`flex items-center gap-3.5 ${
                        isRTL ? "flex-row-reverse" : ""
                      }`}
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white shadow-sm"
                        style={{
                          backgroundColor: "var(--cr-primary, #414E36)",
                        }}
                      >
                        <Check size={13} strokeWidth={3} />
                      </span>
                      <span className="text-sm font-semibold text-[#414E36]">{service}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Interior Clinic Image Column - Examination Room */}
              <div className={`md:col-span-5 ${isRTL ? "md:order-1" : "md:order-2"}`}>
                <div className="relative aspect-[16/10] w-full rounded-[20px] overflow-hidden shadow-md transition-transform duration-500 hover:scale-[1.03]">
                  <Image
                    src="/images/clinic/interior.jpg"
                    alt="Revera Clinics Interior"
                    fill
                    sizes="(max-width: 768px) 100vw, 250px"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            {/* ── Bottom Premium Help & Action Banner ── */}
            <div
              className={`bg-[#EDF1EC] p-6 md:p-8 rounded-[24px] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm border border-[#F2EFE9]/30 ${
                isRTL ? "sm:flex-row-reverse" : ""
              }`}
            >
              {/* Left Side: Phone call details */}
              <div
                className={`flex items-center gap-4 ${
                  isRTL ? "flex-row-reverse text-right" : "text-left"
                }`}
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 hover:scale-105"
                  style={{
                    color: "var(--cr-primary)",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path
                      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                    />
                  </svg>
                </div>
                <div>
                  <p
                    className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#5A6A51]"
                  >
                    {t.about.needHelp}
                  </p>
                  <a
                    href={`tel:${t.about.phone.replace(/\s/g, "")}`}
                    className="text-lg font-normal text-[#414E36] font-heading hover:text-[#5A6A51] transition-colors"
                  >
                    {t.about.phone}
                  </a>
                </div>
              </div>

              {/* Right Side: CTA Button */}
              <div>
                <button
                  onClick={handleBooking}
                  className="group inline-flex items-center gap-3.5 bg-[#414E36] hover:bg-[#2e3a26] text-white text-sm font-semibold py-3 px-6 rounded-full transition-all duration-300 shadow-md hover:shadow-lg"
                  type="button"
                >
                  <span className="tracking-wide capitalize">{t.about.readMore}</span>
                  <span 
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5A6A51] text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300"
                  >
                    <ArrowUpRight size={14} strokeWidth={2.5} />
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
