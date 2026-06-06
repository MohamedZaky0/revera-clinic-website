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

export const metadata: Metadata = {
  title: "About Us - Revera Clinics | Medical Center",
  description:
    "Revera Clinics, under the supervision of Dr. Mahmoud Nasr Abu Obeid, Consultant Surgical Dermatologist with over 15 years of experience.",
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
