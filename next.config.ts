import type { NextConfig } from "next";

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

export default nextConfig;
