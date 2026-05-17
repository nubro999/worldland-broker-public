import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Empty turbopack config to silence the warning
  // Turbopack handles file watching better in WSL by default
  turbopack: {},
};

export default nextConfig;
