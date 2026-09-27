// Arabic-only campaign routes (Google Ads landing pages + their privacy page). They own their own
// lang/dir and must keep the ad URL clean, so the site-wide LanguageProvider / DIR_SCRIPT leave them alone.
export const AD_LANDING_PATH_RE = /^\/(laser-tagamoa|laser-men-tagamoa|privacy)(\/|$)/;

export const isAdLandingPath = (pathname: string) => AD_LANDING_PATH_RE.test(pathname);
