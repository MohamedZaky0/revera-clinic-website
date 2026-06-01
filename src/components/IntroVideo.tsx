"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Play, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const YOUTUBE_EMBED_URL = "https://www.youtube.com/embed/dQw4w9WgXcQ";

export function IntroVideo() {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Close modal on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setIsModalOpen(false);
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isModalOpen, handleKeyDown]);

  const revealClass = `transition-all duration-700 ${
    isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
  }`;

  return (
    <>
      <section ref={sectionRef} className="bg-section section-padding">
        <div className="cr-container">
          {/* Thumbnail wrapper — 16:9 aspect ratio */}
          <div
            className={`relative w-full overflow-hidden rounded-2xl shadow-xl ${revealClass}`}
            style={{ aspectRatio: "16 / 9" }}
          >
            {/* Thumbnail image */}
            <Image
              src="/images/assets/h6.jpg"
              alt="Crystal Rose Clinics — Introduction Video"
              fill
              sizes="(max-width: 768px) 100vw, 1320px"
              className="object-cover"
              priority
            />

            {/* Dark overlay */}
            <div
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(90, 61, 52, 0.45)" }}
              aria-hidden="true"
            />

            {/* Play button overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                aria-label={t.introVideo.playBtn}
                className="group flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg transition-transform duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{ color: "var(--cr-primary)" }}
              >
                <Play
                  size={30}
                  strokeWidth={0}
                  fill="currentColor"
                  className="ml-1"
                />
              </button>

              <span
                className="text-sm font-semibold uppercase tracking-widest text-white"
              >
                {t.introVideo.playBtn}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Video modal ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Video player"
        >
          {/* Modal content — stop click propagation so inner clicks don't close */}
          <div
            className="relative w-full max-w-4xl"
            style={{ aspectRatio: "16 / 9" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close video"
              className="absolute -right-3 -top-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{ color: "var(--cr-primary)" }}
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            {/* YouTube iframe */}
            <iframe
              src={`${YOUTUBE_EMBED_URL}?autoplay=1&rel=0`}
              title="Crystal Rose Clinics Introduction"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full rounded-xl"
              style={{ border: "none" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
