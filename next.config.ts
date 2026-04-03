import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.kakaocdn.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
