/** @type {import('next').NextConfig} */
const nextConfig = {
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
