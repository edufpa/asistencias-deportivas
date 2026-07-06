import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async rewrites() {
    return [
      { source: "/authorize", destination: "/api/mcp/oauth/authorize" },
      { source: "/token", destination: "/api/mcp/oauth/token" },
      { source: "/register", destination: "/api/mcp/oauth/register" },
    ];
  },
};

export default nextConfig;
