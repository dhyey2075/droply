import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable image optimization for Capacitor builds
  output: 'export',
  images: {
    unoptimized: true,
  },
  
  // Disable trailing slash for better mobile compatibility
  trailingSlash: false,
};

export default nextConfig;