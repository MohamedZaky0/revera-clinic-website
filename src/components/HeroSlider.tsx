"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight, Star } from "lucide-react";

const SLIDE_IMAGES = [
  "/images/assets/hero-bg.jpg",
  "/images/assets/dr-hanan-19.jpg",
  "/images/assets/c1621013-7911-431e-983f-ae7d904815f8.jpg",
] as const;

export function HeroSlider() {
  const { t, isRTL } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);

  const openBooking = useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-booking"));
  }, []);

  const slides = t.hero.slides;

  return (
    <section className="relative mx-6 my-8 overflow-hidden rounded-[32px]" style={{ minHeight: "155svh", backgroundColor: "var(--color-brand-primary)" }}>
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{
          clickable: true,
          el: ".custom-pagination",
          bulletClass: "custom-pagination-bullet",
          bulletActiveClass: "custom-pagination-bullet-active",
        }}
        slidesPerView={1}
        spaceBetween={0}
        onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
        style={{ height: "140vh" }}
        className="w-full h-full"
        allowSlidePrev={true}
        allowSlideNext={true}
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i}>
            <div
              key={`slide-content-${i}`}
              className="relative flex flex-col items-start"
              style={{ height: "100%", minHeight: "100%", backgroundColor: "transparent" }}
            >
              {/* Background image */}
              <div className="absolute inset-0 -z-20 h-full">
                <Image
                  src={SLIDE_IMAGES[i]}
                  alt={slide.heading}
                  fill
                  priority
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                  sizes="100vw"
                />
                <div
                  className="absolute inset-0 z-10"
                  style={{
                    background: "rgba(65, 78, 54, 0.22)",
                  }}
                />
              </div>

              {/* Branding at top */}
              <div className="relative z-10 pt-8 pb-12 flex justify-center items-center w-full" style={{ height: "40vh" }}>
                <div className="text-center">
                  <Image
                    src="/images/assets/logo23.png"
                    alt="Revera Logo"
                    width={250}
                    height={250}
                    style={{ margin: "0 auto 12px", opacity: 0.95 }}
                  />
                  <p
                    style={{
                      fontSize: "15px",
                      fontWeight: 400,
                      color: "rgba(251,251,249,0.9)",
                      margin: 0,
                      letterSpacing: "1px",
                    }}
                  >
                    The Skin & Dental Clinics
                  </p>
                </div>
              </div>

              {/* Slide content */}
              <div
                className="relative z-10 flex-1 flex items-start w-full"
                style={{ textAlign: isRTL ? "right" : "left", paddingLeft: isRTL ? 0 : "60px", paddingRight: isRTL ? "60px" : 0, paddingTop: "30px" }}
              >
                <div
                  className={`${isRTL ? "ml-auto" : ""}`}
                  style={{ width: "100%", maxWidth: "760px" }}
                >
                  {/* Section tag */}
                  <span className="section-tag" style={{ color: "var(--color-brand-sand)" }}>{slide.welcome}</span>

                  {/* Heading */}
                  <h1
                    key={`heading-${i}`}
                    className="animate-fade-in-up mt-3 mb-6"
                    style={{ color: "var(--cr-white)" }}
                  >
                    {slide.heading}
                  </h1>

                  {/* Description */}
                  <p
                    key={`desc-${i}`}
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
                        backgroundColor: "var(--color-brand-primary)",
                        color: "var(--color-brand-light)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        borderRadius: "50px",
                        padding: "12px 24px",
                        fontSize: "16px",
                        fontWeight: 500,
                        border: "none",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                          "var(--color-brand-primary-hover)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                          "var(--color-brand-primary)";
                      }}
                    >
                      {slide.bookBtn}
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </button>

                    {/* Google Reviews badge */}
                    <div
                      className="flex items-center gap-3 rounded-full px-5 py-2.5"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.15)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,0.3)",
                      }}
                    >
                      {/* Google icon */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/images/icon-google.svg" alt="Google" width={20} height={20} style={{ flexShrink: 0 }} />

                      {/* Star + rating */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span
                            className="text-base font-semibold"
                            style={{ color: "#fff", fontSize: "16px" }}
                          >
                            {slide.rating}
                          </span>
                          <div className="flex items-center" style={{ gap: "2px" }}>
                            <Star size={16} fill="#FFD700" color="#FFD700" />
                            <Star size={16} fill="#FFD700" color="#FFD700" />
                            <Star size={16} fill="#FFD700" color="#FFD700" />
                            <Star size={16} fill="#FFD700" color="#FFD700" />
                            <Star size={16} fill="rgba(255,215,0,0.5)" color="#FFD700" />
                          </div>
                        </div>
                        <span
                          className="text-sm"
                          style={{ color: "rgba(255,255,255,0.9)", fontSize: "14px" }}
                        >
                          {slide.reviewCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom Pagination */}
      <div
        className="custom-pagination"
        style={{
          position: "absolute",
          bottom: "48px",
          left: "55%",
          transform: "translateX(-50%)",
          zIndex: 20,
          display: "flex",
          gap: "12px",
          height: "10px",
          alignItems: "center",
        }}
      ></div>
    </section>
  );
}


