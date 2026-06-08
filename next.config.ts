import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: ['192.168.15.20', '192.168.15.21', '192.168.15.7', '192.168.15.19', '192.168.15.22', '192.168.15.12', '172.20.10.2'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ulyssryxgkvdkbgvfgpz.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
