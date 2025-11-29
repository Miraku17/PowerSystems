import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: false, // Disable Turbopack to fix CJS module issues
  },
};

export default nextConfig;
