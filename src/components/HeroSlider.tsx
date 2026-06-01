"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";
import { useLanguage } from "@/contexts/LanguageContext";

const SLIDE_IMAGES = [
  "/images/assets/dr-hanan-18.jpg",
  "/images/assets/hero-bg.jpg",
  "/images/assets/dr-hanan-19.jpg",
] as const;

export function HeroSlider() {
  const { t, isRTL } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);

  const openBooking = useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-booking"));
  }, []);

  const slides = t.hero.slides;

  return (
    <section className="relative dark-section" style={{ minHeight: "100svh" }}>
      <Swiper
        modules={[Autoplay, Pagination, EffectFade]}
        effect="fade"
        loop
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
        style={{ minHeight: "100svh" }}
        className="w-full"
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i}>
            <div
              className="relative flex items-center dark-section"
              style={{ minHeight: "100svh" }}
            >
              {/* Background image */}
              <div className="absolute inset-0">
                <Image
                  src={SLIDE_IMAGES[i]}
                  alt={slide.heading}
                  fill
                  priority
                  style={{ objectFit: "cover" }}
                  sizes="100vw"
                />
              </div>

              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/50" />

              {/* Slide content */}
              <div
                className="cr-container relative z-10 py-32"
                style={{ textAlign: isRTL ? "right" : "left" }}
              >
                <div
                  className={`max-w-2xl${isRTL ? " ml-auto" : ""}`}
                >
                  {/* Section tag */}
                  <span className="section-tag">{slide.welcome}</span>

                  {/* Heading — re-keyed on activeIndex so CSS animation replays */}
                  <h1
                    key={`heading-${activeIndex}`}
                    className="animate-fade-in-up mt-3 mb-6"
                    style={{ color: "var(--cr-white)" }}
                  >
                    {slide.heading}
                  </h1>

                  {/* Description */}
                  <p
                    key={`desc-${activeIndex}`}
                    className="animate-fade-in-up stagger-2 text-white/85 mb-8 text-lg leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    {slide.description}
                  </p>

                  {/* CTA row */}
                  <div
                    className={`flex flex-wrap gap-4 items-center${isRTL ? " justify-end" : ""}`}
                  >
                    {/* Book appointment button */}
                    <button
                      className="btn-primary"
                      onClick={openBooking}
                      style={{
                        backgroundColor: "var(--cr-white)",
                        color: "var(--cr-primary)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                          "var(--cr-accent)";
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "var(--cr-white)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                          "var(--cr-white)";
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "var(--cr-primary)";
                      }}
                    >
                      {slide.bookBtn}
                    </button>

                    {/* Google Reviews badge */}
                    <div
                      className="flex items-center gap-3 rounded-full px-4 py-2"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.12)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255,255,255,0.25)",
                      }}
                    >
                      {/* Google icon */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/images/icon-google.svg" alt="Google" width={20} height={20} style={{ flexShrink: 0 }} />

                      {/* Star + rating */}
                      <div className="flex flex-col leading-none">
                        <div className="flex items-center gap-1">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: "var(--cr-white)" }}
                          >
                            ★ {slide.rating}
                          </span>
                        </div>
                        <span
                          className="text-xs mt-0.5"
                          style={{ color: "rgba(255,255,255,0.75)" }}
                        >
                          {slide.reviewCount}
                        </span>
                      </div>

                      {/* Logo face */}
                      <Image
                        src="/images/logo-face.png"
                        alt="Crystal Rose"
                        width={0}
                        height={0}
                        sizes="28px"
                        className="rounded-full"
                        style={{ flexShrink: 0, width: "28px", height: "auto" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
