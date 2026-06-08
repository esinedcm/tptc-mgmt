import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().split('T')[0],
    NEXT_PUBLIC_BUILD_VERSION: process.env.npm_package_version || "0.1.0",
  }
};

export default nextConfig;
