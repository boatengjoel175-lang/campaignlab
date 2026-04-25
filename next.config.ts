import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hdm-stuttgart.de",
      },
    ],
  },
};

export default nextConfig;
