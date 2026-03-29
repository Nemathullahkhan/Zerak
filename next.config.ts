import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true, // TODO: Remove this to deploy
  },
  eslint: {
    ignoreDuringBuilds: true, // TODO: Remove this to deploy production 
  },
};

export default nextConfig;
