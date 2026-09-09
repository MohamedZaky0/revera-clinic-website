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
  async rewrites() {
    return [
      {
        source: '/reception',
        destination: '/admin/reception',
      },
      {
        source: '/doctor',
        destination: '/admin/doctor',
      },
      {
        source: '/superadmin',
        destination: '/admin/superadmin',
      },
    ];
  },
};

export default nextConfig;
