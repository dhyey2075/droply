import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["bullmq", "ioredis"],
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/bullmq/**/*",
      "./node_modules/ioredis/**/*",
      "./node_modules/msgpackr/**/*",
    ],
  },
};

export default nextConfig;
