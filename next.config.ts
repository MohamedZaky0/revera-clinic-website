import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
