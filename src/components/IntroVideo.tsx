"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { X } from "lucide-react";
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
      <section
        ref={sectionRef}
        style={{
          padding: "0 clamp(12px, 2vw, 32px)",
          background: "none",
        }}
      >
        <div className="cr-container" style={{ maxWidth: "1480px" }}>
          {/* Video card — rounded container */}
          <div
            className={`relative w-full overflow-hidden ${revealClass}`}
            style={{
              borderRadius: "32px",
              aspectRatio: "21 / 9",
            }}
          >
            {/* Thumbnail image */}
            <Image
              src="/images/clinic/video-thumbnail.jpg"
              alt="Revera Clinics — Introduction Video"
              fill
              sizes="(max-width: 768px) 100vw, 1480px"
              className="object-cover"
              priority
            />

            {/* Warm overlay */}
            <div
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(164, 148, 135, 0.55)" }}
              aria-hidden="true"
            />

            {/* Center play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                aria-label={t.introVideo.playBtn}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.8)",
                  backgroundColor: "transparent",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  zIndex: 10,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.transform = "scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {/* Play triangle */}
                <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
                  <path
                    d="M2 1.5L20.5 13L2 24.5V1.5Z"
                    fill="white"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* "Play" label under button */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ pointerEvents: "none" }}
            >
              <span
                style={{
                  marginTop: "100px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#fff",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
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
              title="Revera Clinics Introduction"
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
