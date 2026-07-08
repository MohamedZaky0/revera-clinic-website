"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { Language, Direction, Translation } from "@/types";
import { translations } from "@/lib/translations";
import { WhatsappButton } from "@/components/WhatsappButton";

interface LanguageContextValue {
  language: Language;
  direction: Direction;
  t: Translation;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const params = new URLSearchParams(window.location.search);
  const langParam = params.get("lang");
  if (langParam === "ar") return "ar";
  const stored = localStorage.getItem("cr-language") as Language | null;
  if (stored === "ar" || stored === "en") return stored;
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  const [dynamicTranslations, setDynamicTranslations] = useState(translations);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.alert = (message: string) => {
        setAlertMessage(message);
      };

      const handleRejection = (event: PromiseRejectionEvent) => {
        if (event.reason && (event.reason.message === "Failed to fetch" || String(event.reason).includes("Failed to fetch"))) {
          event.preventDefault();
          console.warn("Handled promise rejection:", event.reason);
        }
      };

      const handleError = (event: ErrorEvent) => {
        if (event.error && (event.error.message === "Failed to fetch" || String(event.error).includes("Failed to fetch"))) {
          event.preventDefault();
          console.warn("Handled runtime error:", event.error);
        }
      };

      window.addEventListener("unhandledrejection", handleRejection);
      window.addEventListener("error", handleError);
      return () => {
        window.removeEventListener("unhandledrejection", handleRejection);
        window.removeEventListener("error", handleError);
      };
    }
  }, []);

  useEffect(() => {
    const dir: Direction = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    document.body.className = dir;
    localStorage.setItem("cr-language", language);

    const url = new URL(window.location.href);
    url.searchParams.set("lang", language);
    window.history.replaceState({}, "", url.toString());
  }, [language]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/page-settings", { cache: "no-store" });
        if (res.ok) {
          const homeSettings = await res.json();
          if (homeSettings) {
            setDynamicTranslations(prev => {
              const updated = { ...prev };
              if (homeSettings.hero?.slides) {
                updated.en = {
                  ...updated.en,
                  hero: {
                    ...updated.en.hero,
                    slides: homeSettings.hero.slides,
                  },
                };
              }
              if (homeSettings.hero?.slides_ar) {
                updated.ar = {
                  ...updated.ar,
                  hero: {
                    ...updated.ar.hero,
                    slides: homeSettings.hero.slides_ar,
                  },
                };
              }
              if (homeSettings.about) {
                updated.en = {
                  ...updated.en,
                  about: {
                    ...updated.en.about,
                    ...homeSettings.about,
                  },
                };
                updated.ar = {
                  ...updated.ar,
                  about: {
                    ...updated.ar.about,
                    ...homeSettings.about,
                  },
                };
              }
              if (homeSettings.results) {
                updated.en = {
                  ...updated.en,
                  results: {
                    ...updated.en.results,
                    pairs: homeSettings.results.pairs,
                  },
                };
                updated.ar = {
                  ...updated.ar,
                  results: {
                    ...updated.ar.results,
                    pairs: homeSettings.results.pairs,
                  },
                };
              }
              if (homeSettings.aboutPage) {
                updated.en = {
                  ...updated.en,
                  aboutPage: {
                    ...updated.en.aboutPage,
                    whatWeDoImage1: homeSettings.aboutPage.whatWeDoImage1,
                    whatWeDoImage2: homeSettings.aboutPage.whatWeDoImage2,
                    whatWeDoList: homeSettings.aboutPage.whatWeDoList || updated.en.aboutPage.whatWeDoList,
                    faqTag: homeSettings.aboutPage.faqTag || updated.en.aboutPage.faqTag,
                    faqHeading: homeSettings.aboutPage.faqHeading || updated.en.aboutPage.faqHeading,
                    faqs: homeSettings.aboutPage.faqs || updated.en.aboutPage.faqs,
                    faqImage1: homeSettings.aboutPage.faqImage1 || updated.en.aboutPage.faqImage1,
                    faqImage2: homeSettings.aboutPage.faqImage2 || updated.en.aboutPage.faqImage2,
                  },
                };
                updated.ar = {
                  ...updated.ar,
                  aboutPage: {
                    ...updated.ar.aboutPage,
                    whatWeDoImage1: homeSettings.aboutPage.whatWeDoImage1,
                    whatWeDoImage2: homeSettings.aboutPage.whatWeDoImage2,
                    whatWeDoList: homeSettings.aboutPage.whatWeDoListAr || updated.ar.aboutPage.whatWeDoList,
                    faqTag: homeSettings.aboutPage.faqTagAr || updated.ar.aboutPage.faqTag,
                    faqHeading: homeSettings.aboutPage.faqHeadingAr || updated.ar.aboutPage.faqHeading,
                    faqs: homeSettings.aboutPage.faqsAr || updated.ar.aboutPage.faqs,
                    faqImage1: homeSettings.aboutPage.faqImage1 || updated.ar.aboutPage.faqImage1,
                    faqImage2: homeSettings.aboutPage.faqImage2 || updated.ar.aboutPage.faqImage2,
                  },
                };
              }
              if (homeSettings.howItWorks) {
                updated.en = {
                  ...updated.en,
                  howItWorks: {
                    ...updated.en.howItWorks,
                    heading: homeSettings.howItWorks.heading || updated.en.howItWorks.heading,
                    description: homeSettings.howItWorks.description || updated.en.howItWorks.description,
                  },
                };
                updated.ar = {
                  ...updated.ar,
                  howItWorks: {
                    ...updated.ar.howItWorks,
                    heading: homeSettings.howItWorks.headingAr || updated.ar.howItWorks.heading,
                    description: homeSettings.howItWorks.descriptionAr || updated.ar.howItWorks.description,
                  },
                };
              }
              if (homeSettings.whyChooseUs) {
                updated.en = {
                  ...updated.en,
                  whyChooseUs: {
                    ...updated.en.whyChooseUs,
                    yearsLabel: homeSettings.whyChooseUs.yearsLabel || updated.en.whyChooseUs.yearsLabel,
                    heading: homeSettings.whyChooseUs.heading || updated.en.whyChooseUs.heading,
                    description: homeSettings.whyChooseUs.description || updated.en.whyChooseUs.description,
                    quote: homeSettings.whyChooseUs.quote || updated.en.whyChooseUs.quote,
                    contactLabel: homeSettings.whyChooseUs.contactLabel || updated.en.whyChooseUs.contactLabel,
                    phone: homeSettings.whyChooseUs.phone || updated.en.whyChooseUs.phone,
                    image1: homeSettings.whyChooseUs.image1 || updated.en.whyChooseUs.image1,
                    image2: homeSettings.whyChooseUs.image2 || updated.en.whyChooseUs.image2,
                  },
                };
                updated.ar = {
                  ...updated.ar,
                  whyChooseUs: {
                    ...updated.ar.whyChooseUs,
                    yearsLabel: homeSettings.whyChooseUs.yearsLabelAr || updated.ar.whyChooseUs.yearsLabel,
                    heading: homeSettings.whyChooseUs.headingAr || updated.ar.whyChooseUs.heading,
                    description: homeSettings.whyChooseUs.descriptionAr || updated.ar.whyChooseUs.description,
                    quote: homeSettings.whyChooseUs.quoteAr || updated.ar.whyChooseUs.quote,
                    contactLabel: homeSettings.whyChooseUs.contactLabelAr || updated.ar.whyChooseUs.contactLabel,
                    phone: homeSettings.whyChooseUs.phoneAr || updated.ar.whyChooseUs.phone,
                    image1: homeSettings.whyChooseUs.image1 || updated.ar.whyChooseUs.image1,
                    image2: homeSettings.whyChooseUs.image2 || updated.ar.whyChooseUs.image2,
                  },
                };
              }
              if (homeSettings.footer && homeSettings.footer.serviceHours) {
                updated.en = {
                  ...updated.en,
                  footer: {
                    ...updated.en.footer,
                    serviceHours: homeSettings.footer.serviceHours,
                  },
                };
                updated.ar = {
                  ...updated.ar,
                  footer: {
                    ...updated.ar.footer,
                    serviceHours: homeSettings.footer.serviceHours,
                  },
                };
              }
              return updated;
            });
          }
        }
      } catch (err) {
        console.warn("LanguageProvider: failed to load page settings", err);
      }
    }
    loadSettings();
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const direction: Direction = language === "ar" ? "rtl" : "ltr";
  const value: LanguageContextValue = {
    language,
    direction,
    t: dynamicTranslations[language],
    setLanguage,
    isRTL: language === "ar",
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
      <WhatsappButton />
      {alertMessage && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md animate-fadeInFast">
          <div 
            className="w-full max-w-md rounded-2xl bg-[#FBFBF9] p-6 shadow-2xl border border-[#414E36]/10 text-center animate-scaleUp"
            dir={direction}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#414E36]/5 text-[#414E36] border border-[#414E36]/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-bold text-[#1F251A] mb-3">
              {language === "ar" ? "تنبيه" : "Notification"}
            </h3>
            
            <p className="text-sm text-[#5A6A51] leading-relaxed mb-6 font-medium">
              {alertMessage}
            </p>
            
            <button
              type="button"
              onClick={() => setAlertMessage(null)}
              className="w-full rounded-xl bg-[#414E36] py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#2E3A26] hover:scale-[1.02] active:scale-[0.98]"
            >
              {language === "ar" ? "موافق" : "OK"}
            </button>
          </div>
        </div>
      )}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
