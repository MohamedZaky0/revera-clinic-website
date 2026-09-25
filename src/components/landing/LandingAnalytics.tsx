import Script from "next/script";

/**
 * Loads Google Tag Manager on the ad landing pages only. Renders nothing until
 * NEXT_PUBLIC_GTM_ID is set, so the pages ship safely before the container exists.
 */
export function LandingAnalytics() {
  const id = process.env.NEXT_PUBLIC_GTM_ID;
  if (!id) return null;
  return (
    <>
      <Script id="gtm-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];window.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});`}
      </Script>
      <Script id="gtm-src" src={`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`} strategy="afterInteractive" />
    </>
  );
}
