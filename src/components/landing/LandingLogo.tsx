import Image from "next/image";
import { CLIENT } from "@/config/client";

/** Brand mark + wordmark lockup. The mark is the real logo asset; the wordmark is live text. */
export function LandingLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`lp-logo ${className}`} dir="ltr">
      <Image src={CLIENT.logoMarkPath} alt="" width={105} height={252} className="lp-logo-mark" priority />
      <span className="lp-logo-text">
        <span className="lp-logo-name">{CLIENT.nameShort}</span>
        <span className="lp-logo-sub">CLINIC</span>
      </span>
    </span>
  );
}
