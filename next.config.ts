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
  turbopack: {
    // manifold-3d/manifold subpath export'u yalnız `import` koşulu içeriyor;
    // Turbopack (Vercel build) çözemiyor → koşulsuz .js dosyasına map et.
    resolveAlias: {
      "manifold-3d/manifold": "manifold-3d/manifold.js",
    },
  },
  serverExternalPackages: ["draco3dgltf"],
  // manifold-3d (wasm/emscripten glue) tarayıcıda ölü bir `node:module` dalı içerir;
  // webpack bunu build sırasında çözmeye çalışıp patlar. Client build'de `node:`
  // şemasını çıplak isme çevirip boş modüle düşürüyoruz (dal zaten çalışmıyor).
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        module: false,
        fs: false,
        path: false,
        crypto: false,
      };
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );
    }
    return config;
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
