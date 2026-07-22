import type { Metadata } from "next";
import { Marcellus, Sora } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AlertConfirmProvider } from "@/contexts/AlertConfirmContext";

const marcellus = Marcellus({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marcellus",
  display: "swap",
});

const sora = Sora({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Revera Clinics - Medical Center",
  description:
    "Expert dermatology and cosmetic surgery services with personalized care designed to help you achieve your beauty and health goals through advanced medical techniques.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${marcellus.variable} ${sora.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning spellCheck={false}>
        <LanguageProvider>
          <AlertConfirmProvider>
            {children}
          </AlertConfirmProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
