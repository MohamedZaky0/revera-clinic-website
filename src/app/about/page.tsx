import type { Metadata } from "next";
import { CustomCursor } from "@/components/CustomCursor";
import { Navbar } from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";
import { AboutSection } from "@/components/AboutSection";
import { OurApproachSection } from "@/components/OurApproachSection";
import { AboutWhatWeDo } from "@/components/AboutWhatWeDo";
import { OurJourneySection } from "@/components/OurJourneySection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { OurResults } from "@/components/OurResults";
import { FaqSection } from "@/components/FaqSection";
import { SiteFooter } from "@/components/SiteFooter";
import { BookingModal } from "@/components/BookingModal";
import { AuthModal } from "@/components/AuthModal";

import { CLIENT } from "@/config/client";

export const metadata: Metadata = {
  title: `About Us - ${CLIENT.name} | ${CLIENT.tagline}`,
  description: `${CLIENT.name}, leading medical center offering specialized healthcare and cosmetic services.`,
};

export default function AboutPage() {
  return (
    <>
      <CustomCursor />
      <Navbar />
      <PageHeader pageKey="about" />
      <main>
        <AboutSection />
        <OurApproachSection />
        <AboutWhatWeDo />
        <OurJourneySection />
        <TestimonialsSection />
        <OurResults />
        <FaqSection />
      </main>
      <SiteFooter />
      <BookingModal />
      <AuthModal />
    </>
  );
}
