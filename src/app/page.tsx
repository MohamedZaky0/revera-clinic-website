import { Preloader } from "@/components/Preloader";
import { CustomCursor } from "@/components/CustomCursor";
import { Navbar } from "@/components/Navbar";
import { HeroSlider } from "@/components/HeroSlider";
import { AboutSection } from "@/components/AboutSection";
import { OurResults } from "@/components/OurResults";
import { HomeServicesSection } from "@/components/HomeServicesSection";
import { PackagesSection } from "@/components/PackagesSection";
import { WhatWeDo } from "@/components/WhatWeDo";
import { IntroVideo } from "@/components/IntroVideo";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { HowItWorks } from "@/components/HowItWorks";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { AppointmentSection } from "@/components/AppointmentSection";
import { SiteFooter } from "@/components/SiteFooter";
import { BookingModal } from "@/components/BookingModal";
import { AuthModal } from "@/components/AuthModal";
import { AuthRedirectHandler } from "@/components/AuthRedirectHandler";

export default function Home() {
  return (
    <>
      <AuthRedirectHandler />
      <Preloader />
      <CustomCursor />
      <Navbar />
      <main>
        <section id="home">
          <HeroSlider />
        </section>
        <section id="about">
          <AboutSection />
        </section>
        <OurResults />
        <section id="services">
          <HomeServicesSection />
        </section>
        <PackagesSection />
        {/* <WhatWeDo /> */}
        {/* <IntroVideo /> */}
        <WhyChooseUs />
        {/* <section id="how-it-works">
          <HowItWorks />
        </section> */}
        {/* <TestimonialsSection /> */}
        <section id="appointment">
          <AppointmentSection />
        </section>
      </main>
      <SiteFooter />
      <BookingModal />
      <AuthModal />
    </>
  );
}
