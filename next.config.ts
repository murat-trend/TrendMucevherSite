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
    ],
  },
};

export default nextConfig;
