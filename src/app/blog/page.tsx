import type { Metadata } from "next";
import { CustomCursor } from "@/components/CustomCursor";
import { Navbar } from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";
import { BlogGrid } from "@/components/BlogGrid";
import { SiteFooter } from "@/components/SiteFooter";
import { BookingModal } from "@/components/BookingModal";
import { AuthModal } from "@/components/AuthModal";

export const metadata: Metadata = {
  title: "Blog - Crystal Rose Clinics | Medical Center",
  description: "Latest insights on beauty, skincare, and medical care from Crystal Rose Clinics.",
};

export default function BlogPage() {
  return (
    <>
      <CustomCursor />
      <Navbar />
      <PageHeader pageKey="blog" />
      <main>
        <BlogGrid />
      </main>
      <SiteFooter />
      <BookingModal />
      <AuthModal />
    </>
  );
}
