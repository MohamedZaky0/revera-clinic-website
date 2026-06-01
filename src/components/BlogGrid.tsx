"use client";

import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function BlogGrid() {
  const { t, isRTL } = useLanguage();

  return (
    <section className="section-padding bg-white">
      <div className="cr-container">
        <div
          className="blog-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 30,
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          {t.blogPage.posts.map((post, i) => (
            <article
              key={post.slug}
              className="blog-card"
              style={{
                borderRadius: 16,
                overflow: "hidden",
                background: "#fff",
                boxShadow: "0 4px 24px rgba(90,61,52,0.06)",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.transform = "translateY(-6px)";
                el.style.boxShadow = "0 12px 36px rgba(90,61,52,0.14)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "0 4px 24px rgba(90,61,52,0.06)";
              }}
            >
              {/* Featured image */}
              <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden" }}>
                <img
                  src={post.image}
                  alt={post.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
                />
              </div>

              {/* Body */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexDirection: isRTL ? "row-reverse" : "row",
                  gap: 16,
                  padding: "22px 24px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 18,
                    lineHeight: 1.4,
                    fontFamily: "var(--font-marcellus), serif",
                    color: "var(--cr-primary)",
                    flex: 1,
                  }}
                >
                  {post.title}
                </h2>
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "var(--cr-secondary)",
                    color: "var(--cr-primary)",
                  }}
                >
                  <ArrowRight size={18} style={{ transform: isRTL ? "scaleX(-1)" : "none" }} />
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 992px) {
          .blog-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .blog-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
