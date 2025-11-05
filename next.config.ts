import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Fix for face-api.js in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        encoding: false,
      };
    }
    // Fix for node-fetch encoding issue
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        encoding: false,
      };
    }
    return config;
  },
}

export default nextConfig

