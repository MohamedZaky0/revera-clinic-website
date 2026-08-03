import type { Metadata } from "next";
import { CustomCursor } from "@/components/CustomCursor";
import { Navbar } from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";
import { ServicesSection } from "@/components/ServicesSection";
import { PackagesSection } from "@/components/PackagesSection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { HowItWorks } from "@/components/HowItWorks";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthModal } from "@/components/AuthModal";

import { CLIENT } from "@/config/client";

export const metadata: Metadata = {
  title: `Services - ${CLIENT.name} | ${CLIENT.tagline}`,
  description: `Explore ${CLIENT.name}' comprehensive medical and aesthetic services.`,
};

export default function ServicesPage() {
  return (
    <>
      <CustomCursor />
      <Navbar />
      <PageHeader pageKey="services" />
      <main>
        <ServicesSection />
        <PackagesSection />
        <TestimonialsSection />
        <HowItWorks />
        <WhyChooseUs />
      </main>
      <SiteFooter />
      <AuthModal />
    </>
  );
}
