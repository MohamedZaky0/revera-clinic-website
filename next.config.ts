import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.23.32.1'],
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "octopii-prod-space.ams3.cdn.digitaloceanspaces.com",
        pathname: "/uploads/services/**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: "iox-solutions",
  project: "revera-website-frontend",

  // Source map upload auth token (set in CI / production env)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload wider set of client source files for better stack trace resolution
  widenClientFileUpload: true,

  // Create a proxy API route to bypass ad-blockers
  tunnelRoute: "/monitoring",

  // Suppress non-CI output
  silent: !process.env.CI,
});
