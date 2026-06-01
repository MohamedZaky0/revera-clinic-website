import type { Metadata } from "next";
import { CustomCursor } from "@/components/CustomCursor";
import { Navbar } from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";
import { AboutPageIntro } from "@/components/AboutPageIntro";
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
  title: "About Us - Crystal Rose Clinics | Medical Center",
  description:
    "Crystal Rose Clinics, under the supervision of Dr. Mahmoud Nasr Abu Obeid, Consultant Surgical Dermatologist with over 15 years of experience.",
};

export default function AboutPage() {
  return (
    <>
      <CustomCursor />
      <Navbar />
      <PageHeader pageKey="about" />
      <main>
        <AboutPageIntro />
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
