import { LaserLanding } from "@/components/landing/LaserLanding";
import { landingMetadata } from "@/lib/landingMetadata";

export const metadata = landingMetadata("women");

export default function Page() {
  return <LaserLanding variant="women" />;
}
