"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

export function TestimonialsSection() {
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

  const revealClass = `transition-all duration-700 ${
    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
  }`;

  // Slice reviews to show exactly index 1, 2, and 3 (Aya, Sarah, Omar) as shown in the mockup screenshot
  const displayReviews =
    t.testimonials.reviews.length > 3
      ? t.testimonials.reviews.slice(1, 4)
      : t.testimonials.reviews;

  return (
    <section
      ref={sectionRef}
      id="our-mission"
      className="bg-white section-padding"
      style={{ overflow: "hidden" }}
    >
      <div className="cr-container" style={{ maxWidth: "1480px" }}>
        {/* Curved Card Container with Dark Brown Background */}
        <div
          style={{
            position: "relative",
            backgroundColor: "var(--cr-primary, #414E36)",
            borderRadius: "32px",
            border: "1px solid rgba(196,174,124,0.35)",
            overflow: "hidden",
            padding: "clamp(40px, 6vw, 80px) clamp(24px, 5vw, 72px)",
          }}
        >
          {/* Subtle dot pattern overlay */}
          <div
            className="pointer-events-none absolute inset-0 select-none opacity-[0.06]"
            aria-hidden="true"
          >
            <Image
              src="/images/faq-dot-img.svg"
              alt=""
              fill
              className="object-cover"
              priority
            />
          </div>

          <style>{`
            .tm-grid-top {
              display: grid;
              grid-template-columns: 1fr 1.50fr;
              gap: clamp(32px, 5vw, 60px);
              align-items: center;
              position: relative;
              z-index: 10;
            }
            .tm-doctor-img-wrapper {
              position: relative;
              width: 100%;
              aspect-ratio: 1.25;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 15px 35px rgba(0,0,0,0.15);
            }
            .tm-grid-bottom {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 48px;
              position: relative;
              z-index: 10;
            }

            @media (max-width: 1024px) {
              .tm-grid-top {
                grid-template-columns: 1fr;
                gap: 40px;
              }
              .tm-text-col {
                text-align: center !important;
              }
              .tm-tag-row {
                justify-content: center !important;
              }
              .tm-doctor-img-wrapper {
                max-width: 440px;
                margin: 0 auto;
              }
              .tm-grid-bottom {
                grid-template-columns: 1fr;
                gap: 40px;
              }
            }
          `}</style>

          <div
            className={revealClass}
            style={{
              display: "flex",
              flexDirection: "column",
              direction: isRTL ? "rtl" : "ltr",
            }}
          >
            {/* ── Top Row: Doctor Image & Mission Text ── */}
            <div className="tm-grid-top">
              {/* Doctor portrait wrapper */}
              <div className="tm-doctor-img-wrapper">
                <Image
                  src="/images/clinic/clinic.jpeg"
                  alt={t.testimonials.doctorName}
                  fill
                  sizes="(max-width: 768px) 100vw, 450px"
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                  priority
                />
              </div>

              {/* Mission text details */}
              <div
                className="tm-text-col"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {/* Gold logo tagline */}
                <div
                  className="tm-tag-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "16px",
                    direction: isRTL ? "rtl" : "ltr",
                  }}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-brand-sand)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: 700,
                      letterSpacing: isRTL ? "normal" : "0.2em",
                      color: "var(--color-brand-sand)",
                      textTransform: "uppercase",
                      lineHeight: "normal",
                    }}
                  >
                    {t.testimonials.tag}
                  </span>
                </div>

                {/* Heading */}
                <h2
                  className="font-heading"
                  style={{
                    margin: "0 0 20px 0",
                    fontSize: "clamp(24px, 3.5vw, 36px)",
                    lineHeight: 1.15,
                    fontWeight: 400,
                    color: "#fff",
                  }}
                >
                  {t.testimonials.heading}
                </h2>

                {/* Doctor's message */}
                <p
                  style={{
                    margin: "0 0 24px 0",
                    fontSize: "15px",
                    lineHeight: 1.75,
                    color: "rgba(255, 255, 255, 0.85)",
                    fontWeight: 400,
                  }}
                >
                  {t.testimonials.quote}
                </p>

                {/* Doctor footer details */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "4px" }}
                >
                  <h4
                    className="font-heading"
                    style={{
                      margin: 0,
                      fontSize: "17px",
                      fontWeight: 500,
                      color: "#fff",
                    }}
                  >
                    {t.testimonials.doctorName}
                  </h4>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--color-brand-sand)",
                      fontWeight: 500,
                    }}
                  >
                    {t.testimonials.doctorTitle}
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "rgba(255, 255, 255, 0.6)",
                    }}
                  >
                    {t.testimonials.doctorInfo}
                  </span>
                </div>
              </div>
            </div>

            {/* Horizontal divider line */}
            <div
              style={{
                height: "1px",
                backgroundColor: "rgba(196, 174, 124, 0.15)",
                margin: "48px 0",
              }}
            />

            {/* ── Bottom Row: Testimonials Grid ── */}
            <div className="tm-grid-bottom">
              {displayReviews.map((review, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "24px",
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {/* Testimonial Quote Text */}
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14.5px",
                      lineHeight: 1.65,
                      color: "rgba(255, 255, 255, 0.9)",
                      fontWeight: 400,
                    }}
                  >
                    {review.text}
                  </p>

                  {/* Author Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    {/* Golden outline logo badge */}
                    <div
                      style={{
                        display: "flex",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        border: "1px solid rgba(242, 239, 233, 0.3)",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        flexShrink: 0,
                      }}
                    >
                      <Image
                        src="/images/main_logo.png"
                        alt=""
                        width={20}
                        height={20}
                        style={{ objectFit: "contain", width: "auto", height: "auto" }}
                      />
                    </div>

                    {/* Author Details */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        textAlign: isRTL ? "right" : "left",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#fff",
                        }}
                      >
                        {review.author}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--color-brand-sand)",
                          fontWeight: 500,
                        }}
                      >
                        {review.role}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
