"use client";

import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { useLanguage } from "@/contexts/LanguageContext";

export function TestimonialsSection() {
  const { t, isRTL } = useLanguage();

  return (
    <section className="dark-section section-padding relative overflow-hidden">
      {/* Decorative background shape */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src="/images/testimonials-bg-shape.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-10"
          aria-hidden="true"
        />
      </div>

      <div className="cr-container relative z-10">
        <div
          className={`flex flex-col gap-12 lg:gap-16 lg:items-start ${
            isRTL ? "lg:flex-row-reverse" : "lg:flex-row"
          }`}
        >
          {/* Left: Doctor quote card */}
          <div className="flex-1">
            <span className="section-tag">{t.testimonials.tag}</span>

            <h2 className="mt-3 mb-8 leading-snug">{t.testimonials.heading}</h2>

            {/* Quote */}
            <p
              className="mb-8 text-base italic leading-relaxed"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              {t.testimonials.quote}
            </p>

            {/* Doctor info */}
            <div
              className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <div
                className="relative shrink-0 overflow-hidden rounded-full"
                style={{ width: 70, height: 70 }}
              >
                <Image
                  src="/images/assets/dr-hanan-pp.jpg"
                  alt={t.testimonials.doctorName}
                  fill
                  sizes="70px"
                  className="object-cover"
                />
              </div>
              <div className={isRTL ? "text-right" : "text-left"}>
                <p className="mb-0.5 text-sm font-semibold" style={{ color: "var(--cr-white)" }}>
                  {t.testimonials.doctorName}
                </p>
                <p className="mb-0.5 text-xs" style={{ color: "var(--cr-accent)" }}>
                  {t.testimonials.doctorTitle}
                </p>
                <p className="mb-0 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {t.testimonials.doctorInfo}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Reviews swiper */}
          <div className="flex-1 w-full">
            <Swiper
              modules={[Autoplay, Pagination]}
              autoplay={{ delay: 4000, disableOnInteraction: false }}
              pagination={{ clickable: true }}
              loop
              slidesPerView={1}
              dir={isRTL ? "rtl" : "ltr"}
              key={isRTL ? "rtl" : "ltr"}
              className="pb-10"
            >
              {t.testimonials.reviews.map((review, i) => (
                <SwiperSlide key={i}>
                  <div
                    className="rounded-2xl p-8"
                    style={{ backgroundColor: "var(--cr-white)" }}
                  >
                    {/* Large quote mark */}
                    <div
                      className="mb-4 font-serif leading-none select-none"
                      style={{
                        fontSize: 80,
                        lineHeight: 0.8,
                        color: "var(--cr-accent)",
                        opacity: 0.6,
                      }}
                      aria-hidden="true"
                    >
                      &ldquo;
                    </div>

                    <p
                      className="mb-6 text-sm leading-relaxed"
                      style={{ color: "var(--cr-primary)" }}
                    >
                      {review.text}
                    </p>

                    {/* Author row */}
                    <div
                      className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className="relative shrink-0 overflow-hidden rounded-full"
                        style={{ width: 50, height: 50 }}
                      >
                        <Image
                          src="/images/author-2.jpg"
                          alt={review.author}
                          fill
                          sizes="50px"
                          className="object-cover"
                        />
                      </div>
                      <div className={isRTL ? "text-right" : "text-left"}>
                        <p
                          className="mb-0 text-sm font-semibold"
                          style={{ color: "var(--cr-primary)" }}
                        >
                          {review.author}
                        </p>
                        <p
                          className="mb-0 text-xs"
                          style={{ color: "var(--cr-accent)" }}
                        >
                          {review.role}
                        </p>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </section>
  );
}
