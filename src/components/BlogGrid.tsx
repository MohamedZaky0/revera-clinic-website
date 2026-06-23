"use client";

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
          {t.blogPage.posts.map((post) => (
            <article
              key={post.slug}
              className="blog-card"
            >
              {/* Featured image */}
              <div className="blog-card-img-wrap">
                <img
                  src={post.image}
                  alt={post.title}
                  className="blog-card-img"
                />
              </div>

              {/* Body */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "0 4px",
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
                  className="blog-arrow-btn"
                >
                  <svg 
                    width="18" 
                    height="18" 
                    viewBox="0 0 18 18" 
                    fill="none"
                    style={{ transform: isRTL ? "scaleX(-1)" : "none" }}
                  >
                    <path
                      d="M4 14L14 4M14 4H6M14 4V12"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <style>{`
        .blog-card {
          display: block;
          cursor: pointer;
          background: transparent;
        }
        .blog-card-img-wrap {
          position: relative;
          aspect-ratio: 1/1;
          border-radius: 24px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .blog-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .blog-card:hover .blog-card-img {
          transform: scale(1.04);
        }
        .blog-arrow-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--color-brand-secondary);
          color: #ffffff;
          flex-shrink: 0;
          transition: background-color 0.3s ease, transform 0.3s ease;
        }
        .blog-card:hover .blog-arrow-btn {
          background: var(--color-brand-primary);
        }
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
