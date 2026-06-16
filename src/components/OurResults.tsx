"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BeforeAfterPair {
  before: string;
  after: string;
  id: number;
}

interface StatItem {
  value: string;
  label: string;
  icon: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BEFORE_AFTER_PAIRS: BeforeAfterPair[] = [
  { id: 1, before: "/images/before-after/1-before.jpeg", after: "/images/before-after/1-after.jpeg" },
  { id: 2, before: "/images/before-after/2-before.jpeg", after: "/images/before-after/2-after.jpeg" },
  { id: 3, before: "/images/before-after/3-before.jpeg", after: "/images/before-after/3-after.jpeg" },
  { id: 4, before: "/images/before-after/4-before.jpg",  after: "/images/before-after/4-after.jpg" },
  { id: 5, before: "/images/before-after/5-before.jpg",  after: "/images/before-after/5-after.jpg" },
  { id: 6, before: "/images/before-after/6-before.jpg",  after: "/images/before-after/6-after.jpg" },
];

const STAT_ICONS: string[] = [
  "/images/icon-facts-counter-1.svg",
  "/images/icon-facts-counter-2.svg",
  "/images/icon-facts-counter-3.svg",
  "/images/icon-facts-counter-4.svg",
];

/** Extract the numeric portion and suffix from strings like "20+", "10K+", "50K+" */
function parseStatValue(raw: string): { numeric: number; suffix: string } {
  const match = raw.match(/^(\d+)(.*)$/);
  if (!match) return { numeric: 0, suffix: raw };
  return { numeric: parseInt(match[1], 10), suffix: match[2] ?? "" };
}

// ── Counter hook ──────────────────────────────────────────────────────────────

function useCountUp(
  target: number,
  duration: number,
  active: boolean
): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (target === 0) return;

    const steps = 60;
    const interval = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += 1;
      setCount(Math.round((target * current) / steps));
      if (current >= steps) {
        setCount(target);
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [active, target, duration]);

  return count;
}

// ── StatCounter ───────────────────────────────────────────────────────────────

interface StatCounterProps {
  stat: StatItem;
  active: boolean;
  isRTL: boolean;
}

function StatCounter({ stat, active, isRTL }: StatCounterProps) {
  const { numeric, suffix } = parseStatValue(stat.value);
  const count = useCountUp(numeric, 1800, active);

  return (
    <div
      className={`flex flex-col items-center gap-3 text-center ${
        isRTL ? "font-arabic" : ""
      }`}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--cr-secondary)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={stat.icon}
          alt={stat.label}
          width={28}
          height={28}
          style={{
            filter: "brightness(0) saturate(100%) invert(26%) sepia(21%) saturate(718%) hue-rotate(53deg) brightness(96%) contrast(88%)"
          }}
        />
      </div>
      <div
        className="font-heading text-4xl font-normal leading-none"
        style={{
          color: "var(--cr-primary)",
          transform: stat.value === "10K+" ? (isRTL ? "translateX(-6px)" : "translateX(6px)") : "none",
          display: "inline-block",
        }}
        aria-label={`${stat.value} ${stat.label}`}
      >
        {isRTL
          ? `${suffix}${count}`
          : `${count}${suffix}`}
      </div>
      <p
        className="mb-0 text-sm font-medium"
        style={{ color: "var(--cr-muted-foreground, #5A6A51)" }}
      >
        {stat.label}
      </p>
    </div>
  );
}

// ── OurResults ────────────────────────────────────────────────────────────────

export function OurResults() {
  const { t, isRTL } = useLanguage();
  const statsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);

  // Stats data merged with icons
  const statsWithIcons: StatItem[] = t.results.stats.map((s, i) => ({
    ...s,
    icon: STAT_ICONS[i] ?? STAT_ICONS[0],
  }));

  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeaderVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(headerEl);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const statsEl = statsRef.current;
    if (!statsEl) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(statsEl);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="section-padding bg-white">
      <div className="cr-container">
        {/* Header */}
        <div
          ref={headerRef}
          className={`mb-12 text-center transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="section-tag">{t.results.tag}</span>
          <h2 className="mt-3 max-w-2xl mx-auto">{t.results.heading}</h2>
        </div>

        {/* Before / After Swiper */}
        <div className="mb-16">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            navigation
            pagination={{ clickable: true }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            spaceBetween={24}
            slidesPerView={1}
            breakpoints={{
              768: { slidesPerView: 2 },
            }}
            dir={isRTL ? "rtl" : "ltr"}
            key={isRTL ? "rtl" : "ltr"}
            className="results-swiper"
          >
            {BEFORE_AFTER_PAIRS.map((pair, i) => (
              <SwiperSlide key={pair.id}>
                <BeforeAfterSlide pair={pair} isRTL={isRTL} priority={i === 0} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Stats row */}
        <div
          ref={statsRef}
          className={`grid grid-cols-2 gap-8 lg:grid-cols-4 transition-all duration-700 ${
            statsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {statsWithIcons.map((stat, i) => (
            <StatCounter
              key={i}
              stat={stat}
              active={statsVisible}
              isRTL={isRTL}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── BeforeAfterSlide ──────────────────────────────────────────────────────────

interface BeforeAfterSlideProps {
  pair: BeforeAfterPair;
  isRTL: boolean;
  priority?: boolean;
}

function BeforeAfterSlide({ pair, isRTL, priority = false }: BeforeAfterSlideProps) {
  const beforeLabel = isRTL ? "قبل" : "Before";
  const afterLabel = isRTL ? "بعد" : "After";

  return (
    <div className="flex gap-1 overflow-hidden rounded-xl">
      {/* Before */}
      <div className="relative flex-1 aspect-[3/4]">
        <Image
          src={pair.before}
          alt={`Before ${pair.id}`}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover"
          priority={priority}
        />
        <span
          className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: "rgba(31, 37, 26, 0.8)" }}
        >
          {beforeLabel}
        </span>
      </div>

      {/* After */}
      <div className="relative flex-1 aspect-[3/4]">
        <Image
          src={pair.after}
          alt={`After ${pair.id}`}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover"
          priority={priority}
        />
        <span
          className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: "rgba(90, 106, 81, 0.85)" }}
        >
          {afterLabel}
        </span>
      </div>
    </div>
  );
}
