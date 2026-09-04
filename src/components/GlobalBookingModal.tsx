"use client";

import { usePathname } from "next/navigation";
import { BookingModal } from "@/components/BookingModal";

/**
 * Single global mount for the "Quick Book" popup (triggered from Navbar's Make Appointment
 * CTA via the "open-booking" window event). Lives in the root layout instead of being
 * duplicated per-page. Skipped on /book itself, which already renders the full booking flow
 * inline as page content — mounting the popup there too would be a redundant duplicate.
 */
export function GlobalBookingModal() {
  const pathname = usePathname();
  if (pathname === "/book") return null;
  return <BookingModal />;
}
