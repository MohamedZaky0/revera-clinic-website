import type { Metadata } from "next";
import { CLIENT } from "@/config/client";
import { LANDING_COPY, type LandingVariant } from "@/lib/landingCopy";

export function landingMetadata(variant: LandingVariant): Metadata {
  const c = LANDING_COPY[variant];
  return {
    metadataBase: new URL(CLIENT.siteUrl),
    title: c.docTitle,
    description: c.metaDescription,
    alternates: { canonical: c.path },
    openGraph: {
      type: "website",
      locale: "ar_EG",
      siteName: CLIENT.name,
      title: c.docTitle,
      description: c.metaDescription,
      url: c.path,
      images: [{ url: "/images/landing/clinic.webp", width: 1200, height: 900, alt: c.heroImageAlt }],
    },
  };
}
