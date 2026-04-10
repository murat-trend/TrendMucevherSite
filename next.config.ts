import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    middlewareClientMaxBodySize: "200mb",
    optimizePackageImports: ["framer-motion"],
  },
  turbopack: {},
  serverExternalPackages: ["draco3dgltf"],
  async redirects() {
    return [{ source: "/remaura/cad-koc", destination: "/cad-kocu", permanent: true }];
  },
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

export default nextConfig;
