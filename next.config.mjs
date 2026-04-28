/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
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
