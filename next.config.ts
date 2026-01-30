import type { NextConfig } from "next";

// Static export only for Capacitor (mobile); Vercel uses server build so API routes work
const isCapacitor = process.env.CAPACITOR === "1";

const nextConfig: NextConfig = {
  ...(isCapacitor && { output: "export" }),
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
};

export default nextConfig;