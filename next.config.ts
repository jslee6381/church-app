import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: process.env.STATIC_EXPORT === "true" ? "export" : undefined,
  images: {
    unoptimized: process.env.STATIC_EXPORT === "true",
  },
  trailingSlash: process.env.STATIC_EXPORT === "true",
};

export default nextConfig;
