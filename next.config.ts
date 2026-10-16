import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Files read at runtime: PDF fonts and the demo sample voice note / photo (fixture hashes + sample workspace).
  outputFileTracingIncludes: {
    "/**/*": ["./assets/fonts/**", "./public/samples/**"],
  },
  serverExternalPackages: ["@prisma/client", "pdf-lib", "@pdf-lib/fontkit"],
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
