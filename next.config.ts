import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  async redirects() {
    return [
      {
        source: '/modeller',
        destination: '/portfolyo',
        permanent: true,
      },
      {
        source: '/modeller/',
        destination: '/portfolyo/',
        permanent: true,
      },
    ]
  },
  experimental: {
    proxyClientMaxBodySize: "200mb",
    optimizePackageImports: ["framer-motion"],
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
  outputFileTracingExcludes: {
    "**": [
      "./public/models/**",
      "./public/convert-output/**",
      "./public/videos/**",
      "./scripts/**",
    ],
  },
  turbopack: {},
  serverExternalPackages: ["draco3dgltf"],
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
