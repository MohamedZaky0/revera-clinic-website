import type { Metadata } from "next";
import { Marcellus, Sora } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AlertConfirmProvider } from "@/contexts/AlertConfirmContext";

import { CLIENT } from "@/config/client";

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
  title: `${CLIENT.name} - ${CLIENT.tagline}`,
  description: CLIENT.metaDescription,
  icons: {
    icon: CLIENT.faviconPath,
    apple: CLIENT.faviconPath,
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
