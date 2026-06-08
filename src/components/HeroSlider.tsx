"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import { Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight, Star } from "lucide-react";

const SLIDE_IMAGES = [
  "/images/assets/hero-bg.jpg",
  "/images/assets/dr-hanan-19.jpg",
  "/images/assets/c1621013-7911-431e-983f-ae7d904815f8.jpg",
] as const;

function HeadingWords({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span key={i}>
          <span
            className="hero-word"
            style={{ "--wi": i } as React.CSSProperties}
          >
            {word}
          </span>
          {i < words.length - 1 && " "}
        </span>
      ))}
    </>
  );
}

export function HeroSlider() {
  const { t, isRTL } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [heroReady, setHeroReady] = useState(false);
  const slides = t.hero.slides;

  const openBooking = useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-booking"));
  }, []);

  // Delay content key flip until the preloader has had time to exit (800ms fade
  // starts at 800ms; we flip at 950ms so words animate in as the preloader clears).
  useEffect(() => {
    const timer = setTimeout(() => setHeroReady(true), 950);
    return () => clearTimeout(timer);
  }, []);

  const handleSlideChange = useCallback((swiper: SwiperType) => {
    setActiveIndex(swiper.realIndex);
  }, []);

  const slide = slides[activeIndex];
  const wordCount = slide.heading.split(" ").length;
  const descDelay = wordCount * 65 + 200;
  const ctaDelay = wordCount * 65 + 360;

  // 'pre' key keeps the initial content mounted (animations run hidden under
  // the preloader). At 950ms the key flips to activeIndex, remounting the div
  // and restarting all animations with the scene now visible.
  const contentKey = heroReady ? activeIndex : "pre";

  const slideLabel = `${String(activeIndex + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;

  return (
    <section
      className="relative mx-6 my-8 overflow-hidden rounded-[32px]"
      style={{
        height: "calc(100svh - 176px)",
        minHeight: "380px",
        backgroundColor: "var(--color-brand-primary-deep, #2E3A26)",
      }}
    >
      {/* Background images — cross-fade via Swiper EffectFade */}
      <Swiper
        modules={[Autoplay, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        speed={900}
        slidesPerView={1}
        onSlideChange={handleSlideChange}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        {SLIDE_IMAGES.map((src, i) => (
          <SwiperSlide key={i}>
            <div className="hero-kb absolute inset-0">
              <Image
                src={src}
                alt=""
                fill
                priority={i === 0}
                style={{ objectFit: "cover", objectPosition: "center top" }}
                sizes="100vw"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Gradient: dark olive pools at the base, lifts to clear above midpoint */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(to top, rgba(31,37,26,0.90) 0%, rgba(31,37,26,0.58) 28%, rgba(31,37,26,0.18) 58%, transparent 100%)",
        }}
      />

      {/* Content — key flips after preloader clears, then on each slide change */}
      <div
        key={contentKey}
        dir={isRTL ? "rtl" : "ltr"}
        className="absolute inset-0 z-20 flex flex-col justify-end"
        style={{
          paddingBottom: "clamp(40px, 6svh, 72px)",
          paddingInlineStart: "clamp(28px, 5vw, 60px)",
          paddingInlineEnd: "clamp(28px, 5vw, 60px)",
        }}
      >
        {/* Heading — word-by-word stagger entrance */}
        <h1
          className="mt-0 mb-5"
          style={{
            color: "#FBFBF9",
            fontSize: "clamp(1.85rem, 3.8vw, 3.2rem)",
            fontFamily: "var(--font-marcellus), Georgia, serif",
            fontWeight: 400,
            lineHeight: 1.18,
            letterSpacing: "-0.01em",
            textWrap: "balance",
            maxWidth: "20ch",
          }}
        >
          <HeadingWords text={slide.heading} />
        </h1>

        {/* Description */}
        <p
          className="hero-line mt-0 mb-8"
          style={{
            color: "rgba(251,251,249,0.82)",
            fontSize: "clamp(0.875rem, 1.2vw, 1.025rem)",
            fontFamily: "var(--font-sora), sans-serif",
            lineHeight: 1.72,
            maxWidth: "50ch",
            animationDelay: `${descDelay}ms`,
          }}
        >
          {slide.description}
        </p>

        {/* CTAs */}
        <div
          className="hero-line flex flex-wrap items-center gap-4"
          style={{ animationDelay: `${ctaDelay}ms` }}
        >
          <button
            onClick={openBooking}
            className="btn-primary"
            style={{ fontSize: "15px" }}
          >
            {slide.bookBtn}
            <ArrowRight size={15} strokeWidth={2.5} />
          </button>

          {/* Google Reviews — the one purposeful glass element in the hero */}
          <div
            className="flex items-center gap-3 rounded-full"
            style={{
              backgroundColor: "rgba(255,255,255,0.10)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "10px 18px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/icon-google.svg"
              alt="Google"
              width={18}
              height={18}
              style={{ flexShrink: 0 }}
            />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span
                  style={{
                    color: "#fff",
                    fontSize: "15px",
                    fontWeight: 600,
                    fontFamily: "var(--font-sora), sans-serif",
                  }}
                >
                  {slide.rating}
                </span>
                <div className="flex items-center" style={{ gap: "2px" }}>
                  {[...Array(4)].map((_, i) => (
                    <Star key={i} size={13} fill="#FFD700" color="#FFD700" />
                  ))}
                  <Star size={13} fill="rgba(255,215,0,0.4)" color="#FFD700" />
                </div>
              </div>
              <span
                style={{
                  color: "rgba(255,255,255,0.78)",
                  fontSize: "13px",
                  fontFamily: "var(--font-sora), sans-serif",
                }}
              >
                {slide.reviewCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Slide counter — sits outside the keyed content div so it never
          remounts; transitions via the global opacity transition instead */}
      <div
        aria-label={`Slide ${activeIndex + 1} of ${slides.length}`}
        className="absolute z-20"
        style={{
          bottom: "clamp(40px, 6svh, 72px)",
          insetInlineEnd: "clamp(28px, 5vw, 60px)",
          color: "rgba(251,251,249,0.48)",
          fontSize: "11px",
          fontFamily: "var(--font-sora), sans-serif",
          fontWeight: 500,
          letterSpacing: "0.14em",
          userSelect: "none",
        }}
      >
        {slideLabel}
      </div>

      {/* Accessible live announcement for screen readers */}
      <div className="sr-only" role="status" aria-live="polite">
        {slide.heading}
      </div>
    </section>
  );
}
