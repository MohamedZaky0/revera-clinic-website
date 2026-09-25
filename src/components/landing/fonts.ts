import { Cairo, Playfair_Display } from "next/font/google";

// Self-hosted at build time (no render-blocking request to fonts.googleapis.com).
export const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-lp-cairo",
  display: "swap",
});

export const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-lp-serif",
  display: "swap",
});

export const landingFontClass = `${cairo.variable} ${playfair.variable}`;
