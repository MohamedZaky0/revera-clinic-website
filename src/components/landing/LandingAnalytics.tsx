import Script from "next/script";
import { CLIENT } from "@/config/client";

/**
 * Loads Google Tag Manager on the ad landing pages only (not the admin panel or the rest of the
 * site). The container id is CLIENT.gtmId; NEXT_PUBLIC_GTM_ID overrides it, and an empty value
 * disables GTM entirely (useful for local/preview environments).
 */
export function LandingAnalytics() {
  const id = process.env.NEXT_PUBLIC_GTM_ID ?? CLIENT.gtmId;
  if (!id) return null;
  return (
    <>
      <Script id="gtm-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];window.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});`}
      </Script>
      <Script id="gtm-src" src={`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`} strategy="afterInteractive" />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(id)}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
