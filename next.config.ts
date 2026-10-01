import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  deploymentId:
    process.env.NEXT_DEPLOYMENT_ID ??
    process.env.VERCEL_DEPLOYMENT_ID ??
    process.env.BUILD_ID ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
        port: "",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
