"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

type PageKey = "about" | "services" | "blog" | "contact";

const TITLE_KEY: Record<PageKey, (t: ReturnType<typeof useLanguage>["t"]) => string> = {
  about: (t) => t.aboutPage.pageTitle,
  services: (t) => t.servicesPage.pageTitle,
  blog: (t) => t.blogPage.pageTitle,
  contact: (t) => t.contactPage.pageTitle,
};

const CRUMB_LABEL: Record<PageKey, (t: ReturnType<typeof useLanguage>["t"]) => string> = {
  about: (t) => t.nav.about,
  services: (t) => t.nav.services,
  blog: (t) => t.nav.blog,
  contact: (t) => t.nav.contact,
};

export function PageHeader({ pageKey }: { pageKey: PageKey }) {
  const lang = useLanguage();
  const { t, direction: dir, isRTL } = lang;
  const title = TITLE_KEY[pageKey](t);
  const crumbLabel = CRUMB_LABEL[pageKey](t);

  return (
    <div
      className="bg-white"
      style={{ padding: "0 0 0 0", overflow: "hidden" }}
    >
      <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "0 16px", paddingTop: "0" }}>
        {/* Curved Card Container with Dark Brown Background */}
        <div
          dir={dir}
          style={{
            position: "relative",
            backgroundColor: "var(--cr-primary, #414E36)",
            borderRadius: "60px",
            overflow: "hidden",
            padding: "clamp(80px, 10vw, 130px) clamp(24px, 5vw, 64px) clamp(56px, 8vw, 90px)",
            textAlign: "center",
          }}
        >
          {/* Subtle dot pattern overlay */}
          <div
            className="pointer-events-none absolute inset-0 select-none opacity-[0.05]"
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

          {/* Corner star sparkles */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: "20%",
              right: isRTL ? "auto" : "8%",
              left: isRTL ? "8%" : "auto",
              fontSize: "22px",
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1,
            }}
          >
            ✦
          </span>
          <span
            aria-hidden
            style={{
              position: "absolute",
              bottom: "20%",
              left: isRTL ? "auto" : "5%",
              right: isRTL ? "5%" : "auto",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.25)",
            }}
          />

          {/* Leaf corner decorations */}
          <div
            className="pointer-events-none absolute select-none opacity-[0.07] w-[220px] h-[220px]"
            style={{
              bottom: "-40px",
              left: isRTL ? "auto" : "-40px",
              right: isRTL ? "-40px" : "auto",
              transform: isRTL ? "scaleX(-1) rotate(90deg)" : "rotate(90deg)",
            }}
          >
            <Image
              src="/images/footer-bg-shape.svg"
              alt=""
              fill
              className="object-contain"
            />
          </div>
          <div
            className="pointer-events-none absolute select-none opacity-[0.07] w-[220px] h-[220px]"
            style={{
              top: "-40px",
              right: isRTL ? "auto" : "-40px",
              left: isRTL ? "-40px" : "auto",
              transform: isRTL ? "scaleX(-1)" : "none",
            }}
          >
            <Image
              src="/images/footer-bg-shape.svg"
              alt=""
              fill
              className="object-contain"
            />
          </div>

          <div className="cr-container" style={{ position: "relative", zIndex: 1 }}>
            <h1
              style={{
                fontFamily: "var(--font-marcellus), serif",
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                color: "#fff",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "1rem",
              }}
            >
              {title}
            </h1>

            <nav>
              <ol
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "0.5rem",
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  fontSize: "0.9rem",
                }}
              >
                <li>
                  <Link href="/" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>
                    {t.nav.home}
                  </Link>
                </li>
                <li style={{ color: "rgba(255,255,255,0.5)" }}>/</li>
                <li style={{ color: "#fff" }}>{crumbLabel}</li>
              </ol>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
