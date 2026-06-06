import type { Metadata } from "next";
import { CustomCursor } from "@/components/CustomCursor";
import { Navbar } from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";
import { ServicesSection } from "@/components/ServicesSection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { HowItWorks } from "@/components/HowItWorks";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { SiteFooter } from "@/components/SiteFooter";
import { BookingModal } from "@/components/BookingModal";
import { AuthModal } from "@/components/AuthModal";

export const metadata: Metadata = {
  title: "Services - Revera Clinics | Medical Center",
  description:
    "Explore Revera Clinics' comprehensive dermatology & aesthetic, gynecology, physical therapy, and osteopathy & nutrition services.",
};

export default function ServicesPage() {
  return (
    <>
      <CustomCursor />
      <Navbar />
      <PageHeader pageKey="services" />
      <main>
        <ServicesSection />
        <TestimonialsSection />
        <HowItWorks />
        <WhyChooseUs />
      </main>
      <SiteFooter />
      <BookingModal />
      <AuthModal />
    </>
  );
}
