import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Marcellus, Sora } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AlertConfirmProvider } from "@/contexts/AlertConfirmContext";
import { GlobalBookingModal } from "@/components/GlobalBookingModal";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("cr-language")?.value;
  const lang = langCookie === "ar" ? "ar" : "en";
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${marcellus.variable} ${sora.variable}`}
      suppressHydrationWarning
    >
      <body className={dir} suppressHydrationWarning spellCheck={false}>
        <LanguageProvider>
          <AlertConfirmProvider>
            {children}
            <GlobalBookingModal />
          </AlertConfirmProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
