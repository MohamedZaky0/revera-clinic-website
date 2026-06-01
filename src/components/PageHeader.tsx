"use client";

import Link from "next/link";
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
  const { t, direction: dir } = lang;
  const title = TITLE_KEY[pageKey](t);
  const crumbLabel = CRUMB_LABEL[pageKey](t);

  return (
    <div
      className="page-header-section dark-section"
      dir={dir}
      style={{
        backgroundColor: "var(--cr-primary)",
        backgroundImage: "url(/images/page-header-bg.svg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        padding: "100px 0 80px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(90,61,52,0.82)",
          zIndex: 0,
        }}
      />
      <div className="cr-container" style={{ position: "relative", zIndex: 1 }}>
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -24,
            left: "6%",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.3)",
          }}
        />
        <span
          aria-hidden
          style={{
            position: "absolute",
            bottom: -20,
            right: "8%",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.25)",
          }}
        />

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
              flexDirection: dir === "rtl" ? "row-reverse" : "row",
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
  );
}
