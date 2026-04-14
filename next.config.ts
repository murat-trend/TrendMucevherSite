import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "200mb",
    optimizePackageImports: ["framer-motion"],
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  turbopack: {},
  serverExternalPackages: ["draco3dgltf", "sharp"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
      {
        protocol: "https",
        hostname: "pub-f1f84efc2815459f9c0009f36f3a9ae8.r2.dev",
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
