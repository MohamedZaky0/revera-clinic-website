import type { Metadata } from "next";
import { CustomCursor } from "@/components/CustomCursor";
import { Navbar } from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";
import { BlogGrid } from "@/components/BlogGrid";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthModal } from "@/components/AuthModal";

import { CLIENT } from "@/config/client";

export const metadata: Metadata = {
  title: `Blog - ${CLIENT.name} | ${CLIENT.tagline}`,
  description: `Latest insights on beauty, skincare, and medical care from ${CLIENT.name}.`,
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
      <AuthModal />
    </>
  );
}
