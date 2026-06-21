"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";
import type { Language, Direction, Translation } from "@/types";
import { translations } from "@/lib/translations";

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
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  const currentLang = isAdmin ? "en" : language;

  useEffect(() => {
    const dir: Direction = currentLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = currentLang;
    document.documentElement.dir = dir;
    document.body.className = dir;

    if (!isAdmin) {
      localStorage.setItem("cr-language", language);
      const url = new URL(window.location.href);
      url.searchParams.set("lang", language);
      window.history.replaceState({}, "", url.toString());
    }
  }, [language, currentLang, isAdmin]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const direction: Direction = currentLang === "ar" ? "rtl" : "ltr";
  const value: LanguageContextValue = {
    language: currentLang,
    direction,
    t: translations[currentLang],
    setLanguage,
    isRTL: currentLang === "ar",
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
