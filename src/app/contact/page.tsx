import type { Metadata } from "next";
import { CustomCursor } from "@/components/CustomCursor";
import { Navbar } from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";
import { ContactPageContent } from "@/components/ContactPageContent";
import { SiteFooter } from "@/components/SiteFooter";
import { BookingModal } from "@/components/BookingModal";
import { AuthModal } from "@/components/AuthModal";

export const metadata: Metadata = {
  title: "Contact Us - Crystal Rose Clinics | Medical Center",
  description:
    "Get in touch with Crystal Rose Clinics. Visit us at 36 A El-Nozha St, Ard El Golf, Nasr City, or call (+20) 01125787019.",
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
