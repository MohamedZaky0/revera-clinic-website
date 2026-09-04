import type { Metadata } from "next";
import { CLIENT } from "@/config/client";
import { BookingPageClient } from "@/components/BookingPageClient";

export const metadata: Metadata = {
  title: `Book an Appointment - ${CLIENT.name} | ${CLIENT.tagline}`,
  description: `Book your appointment at ${CLIENT.name} in a few quick steps — choose your service, date and time.`,
  openGraph: {
    title: `Book an Appointment - ${CLIENT.name}`,
    description: `Book your appointment at ${CLIENT.name} in a few quick steps.`,
    images: [CLIENT.logoPath],
  },
  robots: { index: true, follow: true },
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const params = await searchParams;
  const parsed = params.service ? Number(params.service) : NaN;
  const initialServiceId = Number.isFinite(parsed) ? parsed : null;

  return <BookingPageClient initialServiceId={initialServiceId} />;
}
