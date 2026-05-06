import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Note: Since this is a static export, next/image with default loader is not supported.
  // We can use unoptimized images for now.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
