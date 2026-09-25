import { LaserLanding } from "@/components/landing/LaserLanding";
import { landingMetadata } from "@/lib/landingMetadata";

export const metadata = landingMetadata("men");

export default function Page() {
  return <LaserLanding variant="men" />;
}
