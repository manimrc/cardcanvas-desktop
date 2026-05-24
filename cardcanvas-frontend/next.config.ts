import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const isTauri = process.env.TAURI_ENV === 'true';

const nextConfig: NextConfig = {
  output: isTauri ? 'export' : 'standalone',
  images: {
    unoptimized: true,
  },
  // Only use rewrites if NOT building for Tauri (static export doesn't support them)
  ...(isTauri ? {} : {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: `${BACKEND_URL}/api/:path*`,
        },
      ];
    },
  }),
};

export default nextConfig;
