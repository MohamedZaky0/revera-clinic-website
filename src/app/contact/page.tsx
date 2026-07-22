import type { Metadata } from "next";
import { CustomCursor } from "@/components/CustomCursor";
import { Navbar } from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";
import { ContactPageContent } from "@/components/ContactPageContent";
import { SiteFooter } from "@/components/SiteFooter";
import { BookingModal } from "@/components/BookingModal";
import { AuthModal } from "@/components/AuthModal";

import { CLIENT } from "@/config/client";

export const metadata: Metadata = {
  title: `Contact Us - ${CLIENT.name} | ${CLIENT.tagline}`,
  description: `Get in touch with ${CLIENT.name}. Phone: ${CLIENT.phoneDisplay}.`,
};

export default function ContactPage() {
  return (
    <>
      <CustomCursor />
      <Navbar />
      <PageHeader pageKey="contact" />
      <main>
        <ContactPageContent />
      </main>
      <SiteFooter />
      <BookingModal />
      <AuthModal />
    </>
  );
}
